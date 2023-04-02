const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // create transporter
  const transporter = nodemailer.createTransport({
    // gmail is a bad idea for production app. 500 emails per day limit and you will be marked as spammer
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // define email options
  const mailOptions = {
    from: 'Logan Hobbs <hobbs9458@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: leaving blank for now...
  };

  // send email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
