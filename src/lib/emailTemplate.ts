// Email template generation with table-based layout for maximum email client compatibility

export type EmailTemplateData = {
  keyword: string;
  domain: string;
  score: number;
  mentionCount: number;
  totalProviders: number;
  providerCards: string;
  scoreColor: string;
  scoreMessage: string;
};

export function generateEmailHTML(data: EmailTemplateData): string {
  const { keyword, domain, score, mentionCount, totalProviders, providerCards, scoreColor, scoreMessage } = data;
  const notMentioned = totalProviders - mentionCount;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your AI SEO Ranking Report for "${keyword}"</title>
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .header-title { font-size: 24px !important; line-height: 30px !important; }
      .score-number { font-size: 56px !important; }
      .summary-table td { display: block !important; width: 100% !important; padding: 12px !important; }
      .content-padding { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #0a0a0a 0%, #000000 100%); padding: 40px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <h1 class="header-title" style="margin: 0; padding: 0; font-size: 32px; font-weight: 700; color: #ffffff; line-height: 1.2;">🎯 AI Visibility Report</h1>
                    <p style="margin: 10px 0 0 0; padding: 0; font-size: 16px; color: #f59e0b; opacity: 0.95;">Your brand's performance across AI answer engines</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td class="content-padding" style="padding: 32px 30px 20px 30px;">
              <p style="margin: 0; padding: 0; font-size: 16px; color: #374151; line-height: 1.6;">
                Hello! 👋
              </p>
              <p style="margin: 16px 0 0 0; padding: 0; font-size: 16px; color: #374151; line-height: 1.6;">
                Your AI visibility check for <strong>"${keyword}"</strong> is complete. Here's how <strong>${domain}</strong> performs across major AI platforms.
              </p>
            </td>
          </tr>

          <!-- Score Section -->
          <tr>
            <td style="padding: 0 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 12px; padding: 32px 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 16px 0; padding: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #f59e0b; letter-spacing: 1px;">OVERALL VISIBILITY SCORE</p>

                    <!-- Score Circle -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td align="center" style="width: 140px; height: 140px; background-color: #ffffff; border-radius: 50%; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                          <span class="score-number" style="font-size: 64px; font-weight: 700; color: ${scoreColor}; line-height: 140px;">${score}%</span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; padding: 0; font-size: 15px; color: #4b5563; line-height: 1.5;">${scoreMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary Stats -->
          <tr>
            <td style="padding: 24px 30px;">
              <table class="summary-table" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="50%" style="padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;" align="center">
                    <p style="margin: 0 0 8px 0; padding: 0; font-size: 28px; font-weight: 700; color: #10b981;">${mentionCount}</p>
                    <p style="margin: 0; padding: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">MENTIONED</p>
                  </td>
                  <td width="10"></td>
                  <td width="50%" style="padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;" align="center">
                    <p style="margin: 0 0 8px 0; padding: 0; font-size: 28px; font-weight: 700; color: #6b7280;">${notMentioned}</p>
                    <p style="margin: 0; padding: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">NOT FOUND</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Section Title -->
          <tr>
            <td style="padding: 20px 30px 16px 30px;">
              <h2 style="margin: 0; padding: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827; border-bottom: 2px solid #e5e7eb;">Provider Breakdown</h2>
            </td>
          </tr>

          <!-- Provider Cards -->
          <tr>
            <td style="padding: 0 30px 32px 30px;">
              ${providerCards}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 30px;">
              <div style="height: 1px; background-color: #e5e7eb;"></div>
            </td>
          </tr>

          <!-- CTA Section -->
          <tr>
            <td align="center" style="padding: 32px 30px; background-color: #f9fafb;">
              <h3 style="margin: 0 0 8px 0; padding: 0; font-size: 18px; font-weight: 600; color: #111827;">Want to improve your AI visibility?</h3>
              <p style="margin: 0 0 20px 0; padding: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">Track changes over time and optimize your content for AI answer engines</p>
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #f59e0b;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seoaoe.com'}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Run Another Check →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 30px; background-color: #f9fafb; color: #6b7280;">
              <p style="margin: 0 0 8px 0; padding: 0; font-size: 16px; font-weight: 700; color: #111827;">SEO-AOE</p>
              <p style="margin: 0 0 12px 0; padding: 0; font-size: 13px;">AI Visibility Checker for Google & ChatGPT Rankings</p>
              <p style="margin: 0; padding: 0; font-size: 12px; color: #9ca3af;">This is an automated email. If you didn't request this report, you can safely ignore it.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateProviderCard(data: {
  providerName: string;
  providerKey: string;
  statusBadgeColor: string;
  statusBadgeText: string;
  isMentioned: boolean;
  position: number | null;
  competitorCount: number;
  competitors: string;
  snippet: string | null;
  errorMessage: string | null;
}): string {
  const { providerName, providerKey, statusBadgeColor, statusBadgeText, isMentioned, position, competitorCount, competitors, snippet, errorMessage } = data;

  // Google Organic uses ranking position (1-10), others use character position
  const isGoogleOrganic = providerKey === 'google_organic';

  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px; border: 2px solid ${isMentioned ? '#10b981' : statusBadgeColor === '#f59e0b' ? '#f59e0b' : '#e5e7eb'}; border-radius: 10px; background-color: ${isMentioned ? '#f0fdf4' : errorMessage ? '#fffbeb' : '#ffffff'};">
      <tr>
        <td style="padding: 18px;">
          <!-- Header Row -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <strong style="font-size: 16px; color: #111827;">${providerName}</strong>
              </td>
              <td align="right">
                <span style="display: inline-block; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${statusBadgeColor}; color: #ffffff;">${statusBadgeText}</span>
              </td>
            </tr>
          </table>

          ${isMentioned && position !== null ? `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px;">
            <tr>
              <td>
                ${isGoogleOrganic
                  ? `<span style="display: inline-block; padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; background-color: #10b981; color: #ffffff;">🏆 Ranked #${position}</span>
                     <p style="margin: 8px 0 0 0; padding: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">Your domain is ranked #${position} in Google's organic search results. Top 3 rankings drive the most traffic.</p>`
                  : `<span style="display: inline-block; padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; background-color: #10b981; color: #ffffff;">✓ Position #${position + 1}</span>
                     <p style="margin: 8px 0 0 0; padding: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">Your domain appears at character ${position + 1} of the AI's response. Lower positions = earlier mention = better visibility.</p>`
                }
              </td>
            </tr>
          </table>
          ` : ''}

          ${competitorCount > 0 ? `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px;">
            <tr>
              <td style="padding: 12px; background-color: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px;">
                <p style="margin: 0 0 6px 0; padding: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #b45309;">${competitorCount} ${competitorCount === 1 ? 'COMPETITOR' : 'COMPETITORS'} MENTIONED BEFORE YOU</p>
                <p style="margin: 0; padding: 0; font-size: 12px; color: #92400e; line-height: 1.4; word-wrap: break-word;">${competitors}</p>
              </td>
            </tr>
          </table>
          ` : ''}

          ${snippet ? `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px;">
            <tr>
              <td style="padding: 12px; background-color: #ffffff; border-radius: 6px; border-left: 3px solid ${isMentioned ? '#10b981' : '#e5e7eb'};">
                <p style="margin: 0; padding: 0; font-size: 14px; color: #4b5563; line-height: 1.6; word-wrap: break-word;">${snippet}</p>
              </td>
            </tr>
          </table>
          ` : ''}

          ${errorMessage ? `
          <p style="margin: 12px 0 0 0; padding: 0; font-size: 13px; color: #dc2626; font-style: italic;">Error: ${errorMessage}</p>
          ` : ''}
        </td>
      </tr>
    </table>
  `;
}
