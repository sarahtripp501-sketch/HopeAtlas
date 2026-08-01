export default function TermsPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Terms of Service</h1>
      <p style={styles.updated}>Last updated: August 1, 2026</p>

      <p style={styles.text}>
        These Terms of Service ("Terms") govern your use of Hope Atlas (the "app," "we," "our").
        By using Hope Atlas, you agree to these Terms. If you don't agree, please don't use the
        app.
      </p>

      <div style={styles.section}>
        <h2 style={styles.subheading}>1. What Hope Atlas is</h2>
        <p style={styles.text}>
          Hope Atlas is a tool for organizing information related to a cancer diagnosis —
          including diagnosis history, treatments, appointments, medical documents, and
          connections to support, financial, and clinical trial resources. It also allows you to
          share selected information with people you invite to your Care Circle.
        </p>
        <p style={styles.text}>
          Hope Atlas does not require an account. Each visit is tied to an anonymous session
          stored on your device, as described in our{" "}
          <a href="/privacy-policy" style={styles.link}>Privacy Policy</a>.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>2. Not medical advice</h2>
        <p style={styles.text}>
          Hope Atlas provides general educational information and organizational tools only. It
          does not provide medical advice, diagnosis, or treatment recommendations, and nothing
          in the app should be treated as a substitute for professional medical care. Always
          consult a qualified healthcare provider about decisions related to your diagnosis,
          treatment, or care.
        </p>
        <p style={styles.text}>
          Some features use AI to generate explanations, summaries, or answers to questions.
          AI-generated content may be incomplete, outdated, or incorrect, and should not be
          relied upon as a substitute for advice from your care team.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>3. Your responsibility for your information</h2>
        <p style={styles.text}>
          You are responsible for the accuracy of the information you enter into Hope Atlas, and
          for deciding what to upload, share, or disclose — including through Care Circle. Since
          there is no login system, you are also responsible for the security of the device and
          browser you use to access the app; anyone with access to your device and browser
          session can potentially access your Hope Atlas information.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>4. Care Circle sharing</h2>
        <p style={styles.text}>
          If you invite someone to your Care Circle, you are responsible for choosing what
          permissions to grant them and for managing their access, including revoking it when
          appropriate. Hope Atlas is not responsible for how a Care Circle member uses
          information you've chosen to share with them.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>5. Third-party organizations, resources, and links</h2>
        <p style={styles.text}>
          Hope Atlas surfaces information about and links to third-party organizations, clinical
          trials, grants, and other resources, some of which may be identified with AI
          assistance. We do their best to keep this information accurate and up to date, but we
          do not control these third parties and cannot guarantee that program details,
          eligibility requirements, or contact information are current or correct. Always confirm
          directly with the organization before relying on any listed resource.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>6. Acceptable use</h2>
        <p style={styles.text}>
          You agree not to use Hope Atlas to: violate any law; upload content that isn't yours to
          share or that infringes someone else's rights; attempt to access another person's data
          without authorization; interfere with or disrupt the app's normal operation; or misuse
          the Care Circle, feedback, or suggestion features to submit false, abusive, or harmful
          content.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>7. No warranty</h2>
        <p style={styles.text}>
          Hope Atlas is provided "as is" and "as available," without warranties of any kind,
          whether express or implied. We do not guarantee that the app will be uninterrupted,
          error-free, or secure, or that any matching, information, or AI-generated content will
          be accurate or complete.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>8. Limitation of liability</h2>
        <p style={styles.text}>
          To the fullest extent permitted by law, Hope Atlas and its creator are not liable for
          any indirect, incidental, or consequential damages arising from your use of the app,
          including but not limited to reliance on information, resources, or AI-generated
          content found in the app, or the loss of data due to session-based storage.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>9. Changes to the app and these Terms</h2>
        <p style={styles.text}>
          We may update, change, or discontinue features of Hope Atlas at any time. We may also
          update these Terms from time to time; material changes will be reflected by updating
          the "Last updated" date above. Continued use of the app after changes means you accept
          the updated Terms.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subheading}>10. Contact us</h2>
        <p style={styles.text}>
          If you have questions about these Terms, contact us at{" "}
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