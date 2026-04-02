import { supabase } from "@/integrations/supabase/client";

const EMAIL_TEMPLATES = {
  proposal_sent: {
    subject: (title: string) => `Proposal "${title}" has been sent`,
    html: (title: string, clientName: string, total: number, shareUrl: string) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: hsl(152, 45%, 32%); padding: 10px 14px; border-radius: 10px;">
            <span style="color: #ffffff; font-weight: 700; font-size: 18px;">SASKA</span>
          </div>
        </div>
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 12px;">Proposal Sent Successfully</h1>
        <p style="color: #55575d; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Your proposal <strong>"${title}"</strong> has been sent to <strong>${clientName}</strong>.
        </p>
        <div style="background: #f5f0e8; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
          <p style="margin: 0; font-size: 13px; color: #55575d;">Total Value</p>
          <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: hsl(152, 45%, 32%);">$${total.toLocaleString()}</p>
        </div>
        <a href="${shareUrl}" style="display: inline-block; background: hsl(152, 45%, 32%); color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">View Proposal</a>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">— The SASKA Team</p>
      </div>
    `,
  },
  proposal_viewed: {
    subject: (title: string) => `Your proposal "${title}" was viewed`,
    html: (title: string, clientName: string) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: hsl(152, 45%, 32%); padding: 10px 14px; border-radius: 10px;">
            <span style="color: #ffffff; font-weight: 700; font-size: 18px;">SASKA</span>
          </div>
        </div>
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 12px;">👀 Proposal Viewed</h1>
        <p style="color: #55575d; font-size: 14px; line-height: 1.6;">
          <strong>${clientName}</strong> has viewed your proposal <strong>"${title}"</strong>. This is a great time to follow up!
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">— The SASKA Team</p>
      </div>
    `,
  },
  proposal_accepted: {
    subject: (title: string) => `🎉 Proposal "${title}" was accepted!`,
    html: (title: string, clientName: string, total: number) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: hsl(152, 45%, 32%); padding: 10px 14px; border-radius: 10px;">
            <span style="color: #ffffff; font-weight: 700; font-size: 18px;">SASKA</span>
          </div>
        </div>
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 12px;">🎉 Congratulations!</h1>
        <p style="color: #55575d; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          <strong>${clientName}</strong> has accepted your proposal <strong>"${title}"</strong>!
        </p>
        <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin: 0 0 20px; border: 1px solid #a7f3d0;">
          <p style="margin: 0; font-size: 13px; color: #065f46;">Engagement Value</p>
          <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #059669;">$${total.toLocaleString()}</p>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">— The SASKA Team</p>
      </div>
    `,
  },
  proposal_rejected: {
    subject: (title: string) => `Proposal "${title}" was declined`,
    html: (title: string, clientName: string) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: hsl(152, 45%, 32%); padding: 10px 14px; border-radius: 10px;">
            <span style="color: #ffffff; font-weight: 700; font-size: 18px;">SASKA</span>
          </div>
        </div>
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 12px;">Proposal Declined</h1>
        <p style="color: #55575d; font-size: 14px; line-height: 1.6;">
          Unfortunately, <strong>${clientName}</strong> has declined your proposal <strong>"${title}"</strong>. Consider reaching out to understand their needs better.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">— The SASKA Team</p>
      </div>
    `,
  },
  welcome: {
    subject: () => "Welcome to SASKA!",
    html: (name: string) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: hsl(152, 45%, 32%); padding: 10px 14px; border-radius: 10px;">
            <span style="color: #ffffff; font-weight: 700; font-size: 18px;">SASKA</span>
          </div>
        </div>
        <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 12px;">Welcome to SASKA${name ? `, ${name}` : ""}!</h1>
        <p style="color: #55575d; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Your consulting proposal platform is ready. Here's how to get started:
        </p>
        <ol style="color: #55575d; font-size: 14px; line-height: 2; padding-left: 20px;">
          <li>Set up your organization in <strong>Settings</strong></li>
          <li>Add your first <strong>Client</strong></li>
          <li>Create a <strong>Proposal</strong> using our AI-powered builder</li>
          <li>Share it with a single click</li>
        </ol>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">— The SASKA Team</p>
      </div>
    `,
  },
};

export type EmailTemplate = keyof typeof EMAIL_TEMPLATES;

export async function sendNotificationEmail(
  template: EmailTemplate,
  recipientEmail: string,
  ...args: any[]
) {
  try {
    const tmpl = EMAIL_TEMPLATES[template];
    const subject = (tmpl.subject as (...a: any[]) => string)(...args);
    const html = (tmpl.html as (...a: any[]) => string)(...args);

    const { error } = await supabase.functions.invoke("send-email", {
      body: { to: recipientEmail, subject, html },
    });

    if (error) {
      console.error("Email send error:", error);
    }
  } catch (e) {
    console.error("Failed to send notification email:", e);
  }
}
