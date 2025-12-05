const router = require('express').Router();
const ctrl = require('../controllers/bookings.controller');

// Assert handlers exist (clear error if not)
const must = (name, fn) => {
  if (typeof fn !== 'function') throw new Error(`Admin bookings: handler ${name} is not a function`);
};
must('listBookings', ctrl.listBookings);
must('getBookingById', ctrl.getBookingById);
must('createManualBooking', ctrl.createManualBooking);
must('updateBooking', ctrl.updateBooking);
must('cancelBooking', ctrl.cancelBooking);
must('deleteBooking', ctrl.deleteBooking);
must('checkPayPhiStatusAdmin', ctrl.checkPayPhiStatusAdmin);
must('initiatePayPhiPaymentAdmin', ctrl.initiatePayPhiPaymentAdmin);
must('refundPayPhi', ctrl.refundPayPhi);

// List + read - No permissions required
router.get('/', ctrl.listBookings);
router.get('/:id', ctrl.getBookingById);

// Create/update/delete - No permissions required
router.post('/', ctrl.createManualBooking);
router.put('/:id', ctrl.updateBooking);
router.post('/:id/cancel', ctrl.cancelBooking);
router.post('/:id/resend-ticket', ctrl.resendTicket);
router.delete('/:id', ctrl.deleteBooking);

// PayPhi (admin) - No permissions required
router.get('/:id/pay/payphi/status', ctrl.checkPayPhiStatusAdmin);
router.post('/:id/pay/payphi/initiate', ctrl.initiatePayPhiPaymentAdmin);
router.post('/:id/pay/payphi/refund', ctrl.refundPayPhi);

module.exports = router;