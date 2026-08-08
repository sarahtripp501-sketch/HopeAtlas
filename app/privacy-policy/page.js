export default function PrivacyPolicyPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Privacy Policy</h1>
      <p style={styles.updated}>Last updated: August 4, 2026</p>

      <p style={styles.text}>
        Hope Atlas ("we," "our," or "the app") helps people navigate a cancer diagnosis by
        organizing diagnosis information, treatments, appointments, documents, and support
        resources in one place. This policy explains what information the app collects, how
        it's used, and what choices you have.
      </p>

      <div style={styles.section}>
        <h2 style={styles.subheading}>1. Information we collect</h2>
        <p style={styles.text}>
          Hope Atlas does not require an account or login. Instead, each person is identified
          by a private, anonymous session generated and stored on their own device. Depending on
          how you use the app, this session may be associated with:
        </p>
        <ul style={styles.list}>
          <li style={styles.listItem}>Profile details you enter (name, email, phone number, diagnosis, stage, grade, biomarkers, genetic variants, age, insurance, income, ZIP code, current and past treatment)</li>
          <li style={styles.listItem}>Appointments, medications, and diagnosis history you add</li>
          <li style={styles.listItem}>Documents you upload (such as pathology reports, scans, or lab results). AI-generated plain-language explanations are only created if you choose to opt in at the time of upload — they are not generated automatically</li>
          <li style={styles.listItem}>Care Circle members you invite and the permissions you assign them</li>
          <li style={styles.listItem}>Updates and messages posted within Care Circle</li>
          <li style={styles.listItem}>Notification preferences (whether you've opted into email and/or text notifications)</li>
          <li style={styles.listItem}>Cached results from clinical trial and financial assistance matching, stored temporarily to avoid repeating the same search unnecessarily</li>
          <li style={styles.listItem}>Your questions and AI Navigator's answers, saved so your conversation history is available the next time you visit. You can clear this at any time from the AI Navigator page</li>
          <li style={styles.listItem}>Feedback, ratings, and issue reports you submit</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>2. How your information is used</h2>
        <p style={styles.text}>
          Information you provide is used to personalize what you see in the app — for example,
          matching you with relevant clinical trials, financial assistance programs, and support
          organizations, and generating plain-language explanations of uploaded medical documents.
        </p>
        <p style={styles.text}>
          Some features send relevant information to Anthropic's Claude API to generate
          personalized content (such as document explanations, trial matching, and AI-assisted
          answers to your questions). This information is processed to generate a response and
          is not used by us to train AI models.
        </p>
        <p style={styles.text}>
          To find real clinical trials, we send your diagnosis (and, if provided, your
          location) to ClinicalTrials.gov, the U.S. government's public clinical trials
          registry, to retrieve currently-recruiting trials. This ensures every trial shown to
          you is real and verifiable, rather than AI-generated. Anthropic's Claude API is then
          used only to help explain and rank the real results already retrieved — not to search
          for or invent trials.
        </p>
        <p style={styles.text}>
          If you opt into email notifications, we use Resend, a third-party email delivery
          service, to send Care Circle updates, appointment reminders, and alerts about new
          trial, grant, or resource matches to the email address you provide.
        </p>
        <p style={styles.text}>
          If you opt into text notifications and provide a phone number, we use Twilio, a
          third-party messaging service, to send the same types of alerts via SMS. Message
          frequency varies based on your matches, up to about 1 message per day. Standard
          message and data rates from your mobile carrier may apply. You can opt out at any
          time by replying STOP to any message, or by disabling text notifications from Alerts
          & Notifications in the app. We do not sell or share your phone number with third
          parties for their own marketing purposes; it is used only to deliver the
          notifications described here.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>3. Who can see your information</h2>
        <p style={styles.text}>
          By default, your information is visible only to you. If you choose to invite someone
          to your Care Circle, you control exactly what that person can see through individual
          permission settings — nothing is shared automatically. You can revoke or expire a
          person's access at any time, and the app records when their access was last used.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>4. Data storage and security</h2>
        <p style={styles.text}>
          Data is stored using Supabase, a third-party database and file storage provider. We
          take reasonable measures to protect this information, including database-level access
          controls that restrict each session to its own data, but no method of electronic
          storage is completely secure, and we cannot guarantee absolute security.
        </p>
        <p style={styles.text}>
          Because there is no login system, your data is tied to your device's browser session,
          which is stored using your browser's local storage. If you clear your browser data,
          switch devices or browsers, or reinstall the app, you may lose access to previously
          entered information unless you've exported it.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>5. Your choices</h2>
        <p style={styles.text}>
          You can export a full copy of everything tied to your session at any time from
          Settings → Privacy & Data → Export My Data. You can also permanently delete everything
          tied to your session from the same page — this action cannot be undone.
        </p>
        <p style={styles.text}>
          You can turn email and text notifications on or off at any time from Alerts &
          Notifications in the app.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>6. Third-party organizations and links</h2>
        <p style={styles.text}>
          Hope Atlas provides information about and links to third-party organizations, clinical
          trials, and financial assistance programs. We do not control these organizations and
          are not responsible for their content, privacy practices, or the accuracy of their
          information. Always verify details directly with each organization.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>7. Not medical advice</h2>
        <p style={styles.text}>
          Hope Atlas provides general educational information and organizational tools. It does
          not provide medical advice, diagnosis, or treatment, and is not a substitute for
          professional medical care. Always consult your oncology team about decisions related
          to your care.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>8. Children's privacy</h2>
        <p style={styles.text}>
          Hope Atlas is not directed at children under 13, and we do not knowingly collect
          information from children under 13.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>9. Changes to this policy</h2>
        <p style={styles.text}>
          We may update this privacy policy from time to time. Material changes will be
          reflected by updating the "Last updated" date at the top of this page.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>10. Contact us</h2>
        <p style={styles.text}>
          If you have questions about this privacy policy or your data, contact us at{" "}
          <a href="mailto:hello@hopeatlas.co" style={styles.link}>hello@hopeatlas.co</a>.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "24px 18px 80px", maxWidth: "700px", margin: "0 auto", fontFamily: "'Public Sans',-apple-system,sans-serif", color: "#262E2A" },
  heading: { fontSize: "24px", fontWeight: 700, marginBottom: "4px" },
  updated: { fontSize: "13px", color: "#9A9A90", marginBottom: "24px" },
  section: { marginBottom: "24px" },
  subheading: { fontSize: "16px", fontWeight: 700, marginBottom: "8px" },
  text: { fontSize: "14px", lineHeight: 1.7, color: "#333", marginBottom: "10px" },
  list: { margin: "0 0 10px", paddingLeft: "20px" },
  listItem: { fontSize: "14px", lineHeight: 1.7, color: "#333" },
  link: { color: "#3F628F", fontWeight: 600 },
};