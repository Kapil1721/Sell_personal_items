import { PrismaClient } from "@prisma/client";
import sendEmail, { sendMultipleEmails } from "../services/Email.js";

const prisma = new PrismaClient();
export const createDonation = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      pickupAddress,
      pickupDate,
      items,
      amount,
      countryCode,
      type,
    } = req.body;

    let donation;

    if (type === "ITEMS") {
      let newDonation;
      newDonation = {
        userId: req.user.id,
        name: name,
        email,
        phone,
        countryCode: countryCode ? countryCode : "+91",
        pickupAddress,
        pickupDate,
        items,
      };

      //   console.log(newDonation, "hjgdhsjfkhjkghd");
      const slug = Date.now() + name.replaceAll(" ", "-");
      donation = await prisma.donations.create({
        data: {
          name: newDonation.name,
          email: newDonation.email,
          countryCode: newDonation.countryCode,
          phone: newDonation.phone,
          createdAt: new Date(),
          usersId: newDonation.userId,
          items: {
            create: newDonation.items.map((item) => {
              //   console.log(item.category);
              return {
                name: item.name,
                userId: newDonation.userId,
                itemsType: "DONATION",
                quantity: parseInt(item.quantity),
                slug: slug,
                categoryId: parseInt(item.category),
                desription: item.description,
                images: {
                  create: item.image.map((img, i) => ({
                    fileName: img.fileName,
                    image: img.url,
                  })),
                },
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              category: true,
              images: true,
            },
          },
        },
      });
      const admin = await prisma.users.findFirst({
        where: {
          username: "Admin",
          role: "ADMIN",
        },
      });
      sendMultipleEmails(
        {
          email: email,
          subject: `Donation confirmation, Thank You for Your Donation`,
          html: `<!DOCTYPE html>
                 <html lang="en">
               <head>
                   <meta charset="UTF-8">
                   <meta name="viewport" content="width=device-width, initial-scale=1.0">
               </head>
               <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                   <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
                       <tr>
                           <td align="center">
                               <table width="600" border="0" cellspacing="0" cellpadding="0"
                                   style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
                                   <tr>
                                       <td align="center" style="padding: 10px 0;">
                                           <img src="data:image/png;base64,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"
                                               alt="Organization Logo" style="max-width: 100px; height: auto;">
                                       </td>
                                   </tr>
                                   <tr>
                                       <td style="padding: 20px 30px; color: #333333;">
                                           <h1 style="color: #4CAF50; font-size: 24px; margin: 0 0 20px 0;">Thank You for Your Generous
                                               Donation!</h1>
                                           <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                               Dear <strong>${name}</strong>,
                                           </p>
                                           <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                               We are deeply grateful for your recent donation of items to our cause.
                                               Your generosity helps us continue our mission.
                                           </p>
                                           <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                                               <tr>
                                                   <td
                                                       style="background-color: #4CAF50; color: #ffffff; padding: 10px; border-radius: 3px; font-size: 16px; text-align: left;">
                                                       <strong>Your contribution includes:</strong>
                                                   </td>
                                               </tr>
                                               <tr>
                                                   <td style="padding: 10px 0; font-size: 16px; color: #333333;">
                                                       <ul style="margin: 0; padding: 0 0 0 20px; list-style-type: disc;">
                                                           <li><strong>Items Donated:</strong></li>
                                                       </ul>
                                                   </td>
                                               </tr>
                                               <tr>
                                                   <td>
                                                       <table width="100%" border="0" cellspacing="0" cellpadding="0"
                                                           style="border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
                                                           <thead>
                                                               <tr>
                                                                   <th
                                                                       style="background-color: #4CAF50; color: white; padding: 10px; border: 1px solid #dddddd;">
                                                                       Product Image</th>
                                                                   <th
                                                                       style="background-color: #4CAF50; color: white; padding: 10px; border: 1px solid #dddddd;">
                                                                       Product Name</th>
                                                                   <th
                                                                       style="background-color: #4CAF50; color: white; padding: 10px; border: 1px solid #dddddd;">
                                                                       Category</th>
                                                                   <th
                                                                       style="background-color: #4CAF50; color: white; padding: 10px; border: 1px solid #dddddd;">
                                                                       Quantity</th>
                                                               </tr>
                                                           </thead>
                                                           <tbody>
                                                               <tr>
                                                                   <td
                                                                       style="padding: 10px; border: 1px solid #dddddd; text-align: left;">
                                                                       <img src="${items[0].image[0].url}" alt="Placeholder Image"
                                                                           style="max-width: 100%; height: auto; border: none;">
                                                                   </td>
                                                                   <td
                                                                       style="padding: 10px; border: 1px solid #dddddd; text-align: left;">
                                                                       ${donation.items[0].name}</td>
                                                                   <td
                                                                       style="padding: 10px; border: 1px solid #dddddd; text-align: left;">
                                                                       ${donation.items[0].category.name}</td>
                                                                   <td
                                                                       style="padding: 10px; border: 1px solid #dddddd; text-align: left;">
                                                                       ${donation.items[0].quantity}</td>
                                                               </tr>
                                                           </tbody>
                                                       </table>
                                                   </td>
                                               </tr>
                                       </td>
                                   </tr>
                               </table>
                               <!-- <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                   Thanks to donors like you, we can [mention a specific project, goal, or outcome related
                                   to their donation]. Your support makes a real difference in the lives of those we serve.
                               </p> -->
                               <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                   If you have any questions or need further information, please don’t hesitate to contact
                                   us at <a href="mailto:info@salepersonalitems.com"
                                       style="color: #4CAF50; text-decoration: none;">info@salespersonalitems.com</a>. We would
                                   love to keep you updated on how your donation is making an impact.
                               </p>
                               <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                   Once again, thank you for your kindness and generosity. Together, we are creating a
                                   better future.
                               </p>
                               <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                   Sincerely,<br>
                                   <strong>Sale personal Items</strong><br>
                                   <!-- [Your Position]<br> -->
                                   <!-- [Your Organization]<br> -->
                                   <!-- <a href="mailto:[Contact Email]" style="color: #4CAF50; text-decoration: none;">[Contact Information]</a> -->
                               </p>
                           </td>
                       </tr>
                       <tr>
                           <td align="center"
                               style="padding: 20px 0; background-color: #4CAF50; border-radius: 0 0 5px 5px; color: #ffffff;">
                               <p style="margin: 0; font-size: 14px;">&copy; 2024 Sale Personal Items. All rights reserved.
                               </p>
                           </td>
                       </tr>
                   </table>
                   </td>
                   </tr>
                   </table>
               </body>
               </html>`,
        },
        {
          email: admin.email,
          // email: "sonitegss@gmail.com",
          subject: "New Donation recieved",
          html: `<!DOCTYPE html>
         <html lang="en">
      <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
         <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
             <tr>
                 <td align="center">
                     <table width="600" border="0" cellspacing="0" cellpadding="0"
                         style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
                         <tr>
                             <td align="center" style="padding: 10px 0;">
                                 <img src="data:image/png;base64,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"
                                     alt="Organization Logo" style="max-width: 100px; height: auto;">
                             </td>
                         </tr>
                         <tr>
                             <td style="padding: 20px 30px; color: #333333;">
                                 <h1 style="color: #d9534f; font-size: 24px; margin: 0 0 20px 0;">New Donation Received</h1>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     Dear Admin,
                                 </p>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     We have received a new donation from <strong>${name}</strong>. Below are the details of
                                     the donation:
                                 </p>
                                 <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                                     <tr>
                                         <td
                                             style="background-color: #d9534f; color: #ffffff; padding: 10px; border-radius: 3px; font-size: 16px; text-align: left;">
                                             <strong>Donation Details:</strong>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td style="padding: 10px 0; font-size: 16px; color: #333333;">
                                             <ul style="margin: 0; padding: 0 0 0 20px; list-style-type: disc;">
                                                 <li><strong>Donor's Name:</strong> ${name}</li>
                                                 <li><strong>Email:</strong> ${email}</li>
                                                 <li><strong>Items Donated:</strong>
                                                     <table width="100%" border="0" cellspacing="0" cellpadding="0"
                                                         style="border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
                                                         <thead>
                                                             <tr>
                                                                 <th
                                                                     style="background-color: #4CAF50; color: white; padding: 10px; border: 1px solid #dddddd;">
                                                                     Product Image</th>
                                                                 <th
                                                                     style="background-color: #4CAF50; color: white; padding: 10px; border: 1px solid #dddddd;">
                                                                     Product Name</th>
                                                                 <th
                                                                     style="background-color: #4CAF50; color: white; padding: 10px; border: 1px solid #dddddd;">
                                                                     Category</th>
                                                                 <th
                                                                     style="background-color: #4CAF50; color: white; padding: 10px; border: 1px solid #dddddd;">
                                                                     Quantity</th>
                                                             </tr>
                                                         </thead>
                                                         <tbody>
                                                              <tr>
                                                                   <td
                                                                       style="padding: 10px; border: 1px solid #dddddd; text-align: left;">
                                                                       <img src="${
                                                                         donation
                                                                           .items[0]
                                                                           .images[0]
                                                                           .image
                                                                       }" alt="Placeholder Image"
                                                                           style="max-width: 100%; height: auto; border: none;">
                                                                   </td>
                                                                   <td
                                                                       style="padding: 10px; border: 1px solid #dddddd; text-align: left;">
                                                                       ${
                                                                         donation
                                                                           .items[0]
                                                                           .name
                                                                       }</td>
                                                                   <td
                                                                       style="padding: 10px; border: 1px solid #dddddd; text-align: left;">
                                                                       ${
                                                                         donation
                                                                           .items[0]
                                                                           .category
                                                                           .name
                                                                       }</td>
                                                                   <td
                                                                       style="padding: 10px; border: 1px solid #dddddd; text-align: left;">
                                                                       ${
                                                                         donation
                                                                           .items[0]
                                                                           .quantity
                                                                       }</td>
                                                               </tr>
                                                         </tbody>
                                                     </table>
                                                 </li>
                                                 <li><strong>Date of Donation:</strong> ${donation.createdAt.getMonth()}${donation.createdAt.getDate()}, ${donation.createdAt.getFullYear()}</li>
                                             </ul>
                                         </td>
                                     </tr>
                                 </table>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     Please review and acknowledge this donation. If you need any further details, feel free
                                     to contact the donor at <a href="mailto:${email}"
                                         style="color: #d9534f; text-decoration: none;">${email}</a>.
                                 </p>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     Thank you for your attention to this important matter.
                                 </p>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     Sincerely,<br>
                                     <strong>Sale personal Items</strong><br>
                                     <!-- [Your Position]<br> -->
                                     <!-- [Your Organization]<br> -->
                                     <!-- <a href="mailto:[Contact Email]" style="color: #4CAF50; text-decoration: none;">[Contact Information]</a> -->
                                 </p>
                             </td>
                         </tr>
                         <tr>
                             <td align="center"
                                 style="padding: 20px 0; background-color: #4CAF50; border-radius: 0 0 5px 5px; color: #ffffff;">
                                 <p style="margin: 0; font-size: 14px;">&copy; 2024 Sale Personal Items. All rights reserved.
                                 </p>
                             </td>
                         </tr>
                     </table>
                 </td>
             </tr>
         </table>
      </body>
      </html>`,
        }
      );
    } else {
      if (amount === "" || !amount) {
        return res.status(400).json({
          message: "Please select amount",
          status: false,
        });
      }
      if (name === "" || !name) {
        return res.status(400).json({
          message: "Please enter name",
          status: false,
        });
      }
      if (email === "" || !email) {
        return res.status(400).json({
          message: "Please enter email",
          status: false,
        });
      }
      if (phone === "" || !phone) {
        return res.status(400).json({
          message: "Please enter phone",
          status: false,
        });
      }
      donation = await prisma.donations.create({
        data: {
          name: name,
          email: email,
          countryCode: countryCode,
          phone: phone,
          amount: amount,
          createdAt: new Date(),
          usersId: req.user.id,
        },
      });
      const admin = await prisma.users.findFirst({
        where: {
          username: "Admin",
          role: "ADMIN",
        },
      });
      sendMultipleEmails(
        {
          email: email,
          subject: `Donation confirmation, Thank You for Your Donation`,
          html: `<!DOCTYPE html>
                 <html lang="en">
               <head>
                   <meta charset="UTF-8">
                   <meta name="viewport" content="width=device-width, initial-scale=1.0">
               </head>
               <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                   <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
                       <tr>
                           <td align="center">
                               <table width="600" border="0" cellspacing="0" cellpadding="0"
                                   style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
                                   <tr>
                                       <td align="center" style="padding: 10px 0;">
                                           <img src="data:image/png;base64,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"
                                               alt="Organization Logo" style="max-width: 100px; height: auto;">
                                       </td>
                                   </tr>
                                   <tr>
                                       <td style="padding: 20px 30px; color: #333333;">
                                           <h1 style="color: #4CAF50; font-size: 24px; margin: 0 0 20px 0;">Thank You for Your Generous
                                               Donation!</h1>
                                           <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                               Dear <strong>${name}</strong>,
                                           </p>
                                           <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                               We are deeply grateful for your recent donation of money to our cause.
                                               Your generosity helps us continue our mission.
                                           </p>
                                           <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                                               <tr>
                                                   <td
                                                       style="background-color: #4CAF50; color: #ffffff; padding: 10px; border-radius: 3px; font-size: 16px; text-align: left;">
                                                       <strong>Your contribution includes:</strong>
                                                   </td>
                                               </tr>
                                       </td>
                                   </tr>
                                   <tr>
                                       <td style="padding: 10px 0; font-size: 16px; color: #333333;">
                                           <ul style="margin: 0; padding: 0 0 0 20px; list-style-type: disc;">
                                               <li><strong>Monetary Donation:</strong> $${amount}</li>
                                           </ul>
                                       </td>
                                   </tr>
                               </table>
                               <!-- <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                   Thanks to donors like you, we can [mention a specific project, goal, or outcome related
                                   to their donation]. Your support makes a real difference in the lives of those we serve.
                               </p> -->
                               <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                   If you have any questions or need further information, please don’t hesitate to contact
                                   us at <a href="mailto:info@salepersonalitems.com"
                                       style="color: #4CAF50; text-decoration: none;">info@salespersonalitems.com</a>. We would
                                   love to keep you updated on how your donation is making an impact.
                               </p>
                               <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                   Once again, thank you for your kindness and generosity. Together, we are creating a
                                   better future.
                               </p>
                               <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                   Sincerely,<br>
                                   <strong>Sale personal Items</strong><br>
                                   <!-- [Your Position]<br> -->
                                   <!-- [Your Organization]<br> -->
                                   <!-- <a href="mailto:[Contact Email]" style="color: #4CAF50; text-decoration: none;">[Contact Information]</a> -->
                               </p>
                           </td>
                       </tr>
                       <tr>
                           <td align="center"
                               style="padding: 20px 0; background-color: #4CAF50; border-radius: 0 0 5px 5px; color: #ffffff;">
                               <p style="margin: 0; font-size: 14px;">&copy; 2024 Sale Personal Items. All rights reserved.
                               </p>
                           </td>
                       </tr>
                   </table>
                   </td>
                   </tr>
                   </table>
               </body>
               </html>`,
        },
        {
          email: admin.email,
          // email: "sonitegss@gmail.com",
          subject: "New Donation recieved",
          html: `<!DOCTYPE html>
         <html lang="en">
      <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
         <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
             <tr>
                 <td align="center">
                     <table width="600" border="0" cellspacing="0" cellpadding="0"
                         style="background-color: #ffffff; padding: 20px; border-radius: 5px;">
                         <tr>
                             <td align="center" style="padding: 10px 0;">
                                 <img src="data:image/png;base64,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"
                                     alt="Organization Logo" style="max-width: 100px; height: auto;">
                             </td>
                         </tr>
                         <tr>
                             <td style="padding: 20px 30px; color: #333333;">
                                 <h1 style="color: #d9534f; font-size: 24px; margin: 0 0 20px 0;">New Donation Received</h1>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     Dear Admin,
                                 </p>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     We have received a new donation from <strong>${name}</strong>. Below are the details of
                                     the donation:
                                 </p>
                                 <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                                     <tr>
                                         <td
                                             style="background-color: #d9534f; color: #ffffff; padding: 10px; border-radius: 3px; font-size: 16px; text-align: left;">
                                             <strong>Donation Details:</strong>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td style="padding: 10px 0; font-size: 16px; color: #333333;">
                                             <ul style="margin: 0; padding: 0 0 0 20px; list-style-type: disc;">
                                                 <li><strong>Donor's Name:</strong> ${name}</li>
                                                 <li><strong>Email:</strong> ${email}</li>
                                                 <li><strong>Monetary Donation:</strong> $${amount}</li>
                                                 <li><strong>Date of Donation:</strong> ${donation.createdAt.getMonth()} ${donation.createdAt.getDate()}, ${donation.createdAt.getFullYear()}</li>
                                             </ul>
                                         </td>
                                     </tr>
                                 </table>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     Please review and acknowledge this donation. If you need any further details, feel free
                                     to contact the donor at <a href="mailto:${email}"
                                         style="color: #d9534f; text-decoration: none;">${email}</a>.
                                 </p>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     Thank you for your attention to this important matter.
                                 </p>
                                 <p style="font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                     Sincerely,<br>
                                     <strong>Sale personal Items</strong><br>
                                     <!-- [Your Position]<br> -->
                                     <!-- [Your Organization]<br> -->
                                     <!-- <a href="mailto:[Contact Email]" style="color: #4CAF50; text-decoration: none;">[Contact Information]</a> -->
                                 </p>
                             </td>
                         </tr>
                         <tr>
                             <td align="center"
                                 style="padding: 20px 0; background-color: #4CAF50; border-radius: 0 0 5px 5px; color: #ffffff;">
                                 <p style="margin: 0; font-size: 14px;">&copy; 2024 Sale Personal Items. All rights reserved.
                                 </p>
                             </td>
                         </tr>
                     </table>
                 </td>
             </tr>
         </table>
      </body>
      </html>`,
        }
      );
    }

    // console.log(admin.email);

    // console.log(donation.items[0].category.name);
    // console.log(donation.createdAt.getDate());
    return res.status(200).json({
      donation,
      status: true,
      message: "Congratulation! Your donation has been done successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(404).json({
      error,
      message: "Something went wrong! Please try after some time.",
    });
  }
};
