const { pool } = require('../config/db');

/**
 * Service for automatic attraction slot creation
 * Generates time slots for attractions (1-hour duration by default)
 */

class AttractionSlotAutoService {
  /**
   * Generate time slots for an attraction
   * @param {number} attractionId - The attraction ID
   * @param {Array} slotsData - Array of slot data (optional)
   * @param {number} slotDuration - Duration in hours (default: 1)
   */
  static async generateSlotsForAttraction(attractionId, slotsData = [], slotDuration = 1) {
    console.log('generateSlotsForAttraction called with:', { attractionId, slotsDataLength: slotsData?.length, slotDuration });
    
    if (!slotsData || slotsData.length === 0) {
      console.log('No slots data provided, generating default slots...');
      // Generate default slots if none provided
      slotsData = this.generateDefaultSlots(slotDuration);
      console.log(`Generated ${slotsData.length} default slots`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log(`Starting to insert ${slotsData.length} slots for attraction ${attractionId}`);

      for (const slot of slotsData) {
        // Generate a unique slot code
        const slotCode = `${attractionId}-${slot.start_date}-${slot.start_time.replace(':', '')}`;
        console.log(`Inserting slot: ${slotCode}`, slot);
        
        await client.query(
          `INSERT INTO attraction_slots 
           (attraction_id, slot_code, start_date, end_date, start_time, end_time, capacity, price, available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (attraction_id, start_date, end_date, start_time, end_time) 
           DO UPDATE SET capacity = $7, price = $8, available = $9`,
          [
            attractionId,
            slotCode,
            slot.start_date,
            slot.end_date || slot.start_date,
            slot.start_time,
            slot.end_time,
            slot.capacity || 300,
            slot.price || 0,
            slot.available !== false
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`Successfully created ${slotsData.length} slots for attraction ${attractionId}`);
      return { success: true, slotsCreated: slotsData.length };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error generating attraction slots:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate default time slots for all days (next 90 days) from 10:00 AM to 8:00 PM
   * @param {number} slotDuration - Duration in hours (default: 1)
   */
  static generateDefaultSlots(slotDuration = 1) {
    const slots = [];
    const startHour = 10; // 10:00 AM
    const endHour = 20;   // 8:00 PM
    
    // Generate for next 90 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 90);

    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      
      // Generate continuous slots throughout the day
      for (let hour = startHour; hour + slotDuration <= endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endTime = `${(hour + slotDuration).toString().padStart(2, '0')}:00`;
        
        slots.push({
          start_date: dateStr,
          end_date: dateStr,
          start_time: startTime,
          end_time: endTime,
          capacity: 300, // Updated capacity to 300
          available: true
        });
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return slots;
  }
}

module.exports = AttractionSlotAutoService;
