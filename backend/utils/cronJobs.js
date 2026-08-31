import cron from 'node-cron';
import Grievance from '../models/Grievance.js';
import User from '../models/User.js';
import { sendFollowUpEmail } from './mailer.js';
import { RESOLUTION_DAYS } from './portalData.js';

/**
 * Auto Follow-Up Email Scheduler
 * Runs every day at 9:00 AM IST.
 * Checks for unresolved grievances past their expected resolution time
 * and sends a follow-up email to the citizen.
 */
export function startCronJobs() {
  // Schedule: 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ [CRON] Running daily follow-up email check...');

    try {
      // Find all grievances that are NOT resolved/closed and haven't gotten a follow-up
      const grievances = await Grievance.find({
        status: { $nin: ['resolved', 'closed'] },
        follow_up_sent: false
      });

      let emailsSent = 0;

      for (const grievance of grievances) {
        const expectedDays = RESOLUTION_DAYS[grievance.category] || RESOLUTION_DAYS.other;
        const daysElapsed = (Date.now() - new Date(grievance.submitted_at).getTime()) / (1000 * 60 * 60 * 24);

        if (daysElapsed >= expectedDays) {
          try {
            // Fetch the citizen's email from User collection
            const user = await User.findById(grievance.user_id);
            if (!user || !user.email) continue;

            await sendFollowUpEmail(
              user.email,
              grievance._id.toString(),
              grievance.category || 'general',
              grievance.title || 'Your grievance'
            );

            // Mark as sent so we don't email again
            grievance.follow_up_sent = true;
            await grievance.save();
            emailsSent++;
          } catch (emailErr) {
            console.error(`❌ [CRON] Failed to email for grievance ${grievance._id}:`, emailErr.message);
          }
        }
      }

      console.log(`✅ [CRON] Daily follow-up complete. Emails sent: ${emailsSent}`);
    } catch (error) {
      console.error('❌ [CRON] Follow-up job failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log('🕐 Cron jobs initialized — follow-up emails scheduled daily at 9:00 AM');
}
