/**
 * Simple slugify function for generating URL-friendly slugs
 * @param {string} text - The text to slugify
 * @returns {string} - The slugified text
 */
function slugify(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

module.exports = { slugify };