/**
 * Browser detection utilities
 */

/**
 * Detects if the extension is running in Firefox
 */
export const isFirefox = (): boolean => {
  return navigator.userAgent.toLowerCase().includes('firefox');
};

/**
 * Gets browser-specific style adjustments for popup windows
 */
export const getPopupStyles = () => {
  if (isFirefox()) {
    // Firefox needs specific height to avoid scrollbars
    return {
      minHeight: '400px',
      height: 'auto',
      maxHeight: '600px',
    };
  }
  
  // Chrome handles auto-sizing better
  return {
    height: 'auto',
    minHeight: 'auto',
    maxHeight: '600px',
  };
};

/**
 * Gets browser-specific body styles
 */
export const getBodyStyles = () => {
  const baseStyles = {
    margin: 0,
    padding: 0,
    overflow: 'hidden',
  };

  if (isFirefox()) {
    return {
      ...baseStyles,
      width: '384px',
      minHeight: '400px',
    };
  }

  return baseStyles;
};