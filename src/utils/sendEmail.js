// Mock email function
const sendEmail = async ({
  to,
  subject,
  html,
  text,
}) => {
  console.log('Email sent:', {
    to,
    subject,
    html,
    text,
  });
  // Return a resolved promise to simulate success
  return true;
};

module.exports = sendEmail;