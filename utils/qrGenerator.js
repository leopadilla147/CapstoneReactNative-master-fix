export const generateQRData = (thesisId, action = 'view') => {
  return JSON.stringify({
    type: 'thesis',
    thesis_id: thesisId,
    action: action, // 'view', 'borrow', etc.
    timestamp: Date.now(),
    version: '1.0'
  });
};

export const generateBorrowQRData = (userId, thesisId) => {
  const transactionId = `BORROW_${Date.now()}_${userId}_${thesisId}`;
  
  return JSON.stringify({
    type: 'borrow',
    transaction_id: transactionId,
    user_id: userId,
    thesis_id: thesisId,
    timestamp: Date.now(),
    expires: Date.now() + (15 * 60 * 1000), // 15 minutes expiry
    version: '1.0'
  });
};