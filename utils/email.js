// import nodemailer from "nodemailer";
// import Mailgen from "mailgen";
const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');

//transporter is a way to send mail.
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});
// mailgen is a way to generate mail.
const mailGenerators = {
    "email-verification": new Mailgen({
        theme: "default",
        product: {
            name: "DLanzer CRM",
            link: "https://dlanzer.com"
        }
    }),
    "welcome": new Mailgen({
        theme: "default",
        product: {
            name: "DLanzer CRM",
            link: "https://dlanzer.com"
        }
    }),
    "password-reset": new Mailgen({
        theme: "default",
        product: {
            name: "DLanzer CRM",
            link: "https://dlanzer.com"
        }
    })
};
module.exports.sendMail = function sendMail (email, type, data) {
    return new Promise(async (resolve, reject) => {
        try {
            const recipients = [email];

            const mailGenerator = mailGenerators[type];

            if (!mailGenerator) {
                throw new Error(`Invalid email type: ${type}`);
            }

            // Generate an HTML email with the provided data objects.
            let emailTemplate;
            switch (type) {
                case "email-verification":
                    emailTemplate = mailGenerator.generate({
                        body: {
                            intro: "Welcome to DLanzer! Confirm your email address to get started.",
                            action: {
                                instructions: "Your verification code",
                                button: {
                                    color: "#22BC66",
                                    text: data.code,
                                }
                            }
                        }
                    });
                    break;

                case "password-reset":
                    emailTemplate = mailGenerator.generate({
                        body: {
                            intro: `Hi ${data.name}, You have requested a password reset.`,
                            action: {
                                instructions: "Password verification code.",
                                button: {
                                    color: "#22BC66",
                                    text: data.code,
                                }
                            }
                        }
                    });
                    break;

                default:
                    throw new Error(`Invalid email type: ${type}`);
            }

            const mailOptions = {
                from: process.env.MAIL_USERNAME,
                to: recipients,
                subject: type,
                html: emailTemplate,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent:", info);

            resolve(true);
        } catch (error) {
            console.error("Error sending email:", error);
            reject(error);
        }
    });
};
