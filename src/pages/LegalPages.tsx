import React from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { SeoHead } from '../components/SeoHead';

function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 md:px-10 py-10 md:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent mb-3">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-snow">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-mist">{subtitle}</p>}
          <div className="mt-10 prose-legal">{children}</div>
          <p className="mt-12 pt-6 border-t border-line/80 text-sm text-mist">
            <Link to="/" className="text-accent hover:text-accent-dim transition-colors">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg md:text-xl font-bold text-snow mb-3">{title}</h2>
      <div className="space-y-3 text-sm md:text-[15px] text-fog leading-relaxed">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-fog">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function TermsPage() {
  return (
    <>
      <SeoHead
        page="terms"
        title="Terms & Conditions | Codewix Studio"
        description="Terms & Conditions for Codewix Studio AI-powered product video generation platform."
      />
      <LegalShell title="Terms & Conditions" subtitle="Effective Date: July 23, 2026">
        <Section title="Welcome">
          <p>
            Welcome to <strong className="text-snow">Codewix Studio</strong> (&quot;Company&quot;,
            &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). These Terms &amp; Conditions
            (&quot;Terms&quot;) govern your access to and use of our AI-powered product video
            generation platform (the &quot;Service&quot;).
          </p>
          <p>
            By accessing or using our Service, you agree to be bound by these Terms. If you do not
            agree, you must not use the Service.
          </p>
        </Section>

        <Section title="1. Company Information">
          <p>
            <strong className="text-snow">Company Name:</strong> Codewix Studio
          </p>
          <p>
            <strong className="text-snow">Address:</strong>
            <br />
            46/A1, Ground Floor, Mannur, Mattannur, Kannur, Kerala – 670702, India
          </p>
          <p>
            <strong className="text-snow">Email:</strong>{' '}
            <a href="mailto:info@codewix.in" className="text-accent hover:text-accent-dim">
              info@codewix.in
            </a>
          </p>
          <p>
            <strong className="text-snow">Phone:</strong>{' '}
            <a href="tel:+919746109569" className="text-accent hover:text-accent-dim">
              +91 9746109569
            </a>
          </p>
        </Section>

        <Section title="2. About the Service">
          <p>
            Our platform enables users to generate professional product videos using Artificial
            Intelligence.
          </p>
          <p>
            Users upload product images and provide prompts or desired atmospheres. Our AI models
            generate video content based on the provided inputs.
          </p>
          <p>
            The generated results are AI-generated and may vary depending on the quality of uploaded
            images, prompts, and AI model behavior.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>You must:</p>
          <BulletList
            items={[
              'Be at least 18 years old, or',
              'Have permission from a parent or legal guardian.',
            ]}
          />
          <p>You are responsible for ensuring your use complies with all applicable laws.</p>
        </Section>

        <Section title="4. User Account">
          <p>To access certain features, you may need to create an account.</p>
          <p>You agree to:</p>
          <BulletList
            items={[
              'Provide accurate information.',
              'Keep your login credentials secure.',
              'Be responsible for all activity under your account.',
              'Notify us immediately of unauthorized access.',
            ]}
          />
          <p>
            We reserve the right to suspend or terminate accounts involved in abuse, fraud, or
            violations of these Terms.
          </p>
        </Section>

        <Section title="5. Free Plan">
          <p>The Free Plan may include limited features, including but not limited to:</p>
          <BulletList
            items={[
              'Limited AI generations',
              'Watermarked outputs',
              'Lower processing priority',
              'Restricted access to premium models',
            ]}
          />
          <p>Free plan limits may change without prior notice.</p>
        </Section>

        <Section title="6. Pro Plan">
          <p>Pro subscriptions unlock premium features, including but not limited to:</p>
          <BulletList
            items={[
              'Higher generation limits',
              'Faster processing',
              'Premium AI models',
              'High-quality exports',
              'Additional customization features',
            ]}
          />
          <p>Features may evolve over time as the platform improves.</p>
        </Section>

        <Section title="7. Payments">
          <p>
            Payments are securely processed through <strong className="text-snow">Razorpay</strong>.
          </p>
          <p>
            By purchasing a subscription, you authorize the applicable charges for the selected
            plan.
          </p>
          <p>Applicable taxes may be charged where required by law.</p>
        </Section>

        <Section title="8. Subscription Renewal">
          <p>
            If your subscription is recurring, it will automatically renew unless cancelled before
            the next billing cycle.
          </p>
          <p>You are responsible for managing your subscription before renewal.</p>
        </Section>

        <Section title="9. Refund Policy">
          <p>Unless otherwise required by applicable law:</p>
          <BulletList
            items={[
              'All payments are final.',
              'Subscription fees are non-refundable.',
              'Partial usage does not qualify for refunds.',
              'AI processing credits already consumed are non-refundable.',
            ]}
          />
          <p>
            If duplicate billing or technical payment errors occur, please contact us for
            assistance.
          </p>
        </Section>

        <Section title="10. AI Generated Content">
          <p>Our platform uses Artificial Intelligence to generate videos.</p>
          <p>Because AI generation is probabilistic:</p>
          <BulletList
            items={[
              'Results may vary.',
              'We do not guarantee perfect accuracy.',
              'Generated videos may not always match user expectations.',
              'Users remain responsible for reviewing generated content before commercial use.',
            ]}
          />
        </Section>

        <Section title="11. User Content">
          <p>You retain ownership of images and prompts you upload.</p>
          <p>By using the Service, you grant us a limited license solely for:</p>
          <BulletList
            items={[
              'Processing uploads',
              'Generating requested videos',
              'Improving platform performance where permitted by law',
            ]}
          />
          <p>We do not claim ownership of your uploaded content.</p>
        </Section>

        <Section title="12. Prohibited Uses">
          <p>You agree not to use the Service to:</p>
          <BulletList
            items={[
              'Upload illegal content.',
              'Generate defamatory material.',
              'Create misleading advertisements.',
              'Infringe copyrights or trademarks.',
              'Upload content you do not own or have permission to use.',
              'Generate explicit sexual content.',
              'Generate child exploitation material.',
              'Promote violence or terrorism.',
              'Spread malware or malicious code.',
              'Violate applicable laws.',
            ]}
          />
          <p>
            Violation may result in immediate suspension or permanent account termination.
          </p>
        </Section>

        <Section title="13. Intellectual Property">
          <p>
            The platform, software, interface, branding, logos, source code, designs, and underlying
            technology remain the exclusive property of Codewix Studio.
          </p>
          <p>No ownership rights are transferred to users.</p>
        </Section>

        <Section title="14. Availability">
          <p>We strive for high availability but do not guarantee uninterrupted service.</p>
          <p>
            Maintenance, updates, third-party outages, or unforeseen technical issues may temporarily
            affect the Service.
          </p>
        </Section>

        <Section title="15. AI Model Availability">
          <p>
            Our platform may use third-party AI models, including but not limited to Gemini, Omni, or
            similar technologies.
          </p>
          <p>
            Availability of specific models may change without notice depending on provider
            policies, pricing, or technical limitations.
          </p>
        </Section>

        <Section title="16. Content Responsibility">
          <p>You are solely responsible for:</p>
          <BulletList
            items={[
              'Uploaded images',
              'Prompts',
              'Generated content',
              'Any commercial use of generated videos',
            ]}
          />
          <p>We do not verify ownership of uploaded materials.</p>
        </Section>

        <Section title="17. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, Codewix Studio shall not be liable for:
          </p>
          <BulletList
            items={[
              'Loss of profits',
              'Business interruption',
              'Lost data',
              'AI generation inaccuracies',
              'Third-party service failures',
              'Indirect, incidental, or consequential damages',
            ]}
          />
          <p>
            Our maximum liability shall not exceed the amount paid by you for the Service during the
            preceding twelve (12) months.
          </p>
        </Section>

        <Section title="18. Indemnification">
          <p>
            You agree to indemnify and hold harmless Codewix Studio, its owners, employees,
            affiliates, and partners against claims, liabilities, damages, expenses, or legal costs
            arising from:
          </p>
          <BulletList
            items={[
              'Your use of the Service.',
              'Your uploaded content.',
              'Violation of these Terms.',
              'Infringement of third-party rights.',
            ]}
          />
        </Section>

        <Section title="19. Privacy">
          <p>
            Your use of the Service is also governed by our{' '}
            <Link to="/privacy" className="text-accent hover:text-accent-dim">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="20. Suspension and Termination">
          <p>We may suspend or terminate your account without prior notice if you:</p>
          <BulletList
            items={[
              'Violate these Terms.',
              'Engage in fraudulent activity.',
              'Abuse platform resources.',
              'Attempt unauthorized access.',
              'Use the platform for unlawful purposes.',
            ]}
          />
        </Section>

        <Section title="21. Changes to the Service">
          <p>We may:</p>
          <BulletList
            items={[
              'Add or remove features.',
              'Update pricing.',
              'Modify AI models.',
              'Improve functionality.',
              'Discontinue certain features.',
            ]}
          />
          <p>Such changes may occur without prior notice.</p>
        </Section>

        <Section title="22. Changes to These Terms">
          <p>We reserve the right to update these Terms at any time.</p>
          <p>The latest version will always be available on our website.</p>
          <p>
            Continued use of the Service constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="23. Governing Law">
          <p>
            These Terms shall be governed by and interpreted in accordance with the laws of India.
          </p>
          <p>
            Any disputes shall be subject to the exclusive jurisdiction of the competent courts
            located in Kannur, Kerala, India.
          </p>
        </Section>

        <Section title="24. Severability">
          <p>
            If any provision of these Terms is found invalid or unenforceable, the remaining
            provisions shall continue in full force and effect.
          </p>
        </Section>

        <Section title="25. Entire Agreement">
          <p>
            These Terms constitute the entire agreement between you and Codewix Studio regarding the
            use of the Service and supersede all prior agreements or understandings.
          </p>
        </Section>

        <Section title="26. Contact Us">
          <p>For questions regarding these Terms &amp; Conditions, please contact:</p>
          <p>
            <strong className="text-snow">Codewix Studio</strong>
          </p>
          <p>
            46/A1, Ground Floor, Mannur, Mattannur, Kannur, Kerala – 670702, India
          </p>
          <p>
            Email:{' '}
            <a href="mailto:info@codewix.in" className="text-accent hover:text-accent-dim">
              info@codewix.in
            </a>
          </p>
          <p>
            Phone:{' '}
            <a href="tel:+919746109569" className="text-accent hover:text-accent-dim">
              +91 9746109569
            </a>
          </p>
        </Section>
      </LegalShell>
    </>
  );
}

export function PrivacyPage() {
  return (
    <>
      <SeoHead
        page="privacy"
        title="Privacy Policy | Codewix Studio"
        description="Privacy Policy for Codewix Studio — how we collect, use, store, and protect your personal information."
      />
      <LegalShell title="Privacy Policy" subtitle="Effective Date: July 23, 2026">
        <Section title="Welcome">
          <p>
            Codewix Studio (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
            values your privacy and is committed to protecting your personal information. This
            Privacy Policy explains how we collect, use, store, disclose, and protect your
            information when you use our AI-powered product video generation platform (the
            &quot;Service&quot;).
          </p>
          <p>
            By using our Service, you agree to the practices described in this Privacy Policy.
          </p>
        </Section>

        <Section title="1. Company Information">
          <p>
            <strong className="text-snow">Company Name:</strong> Codewix Studio
          </p>
          <p>
            <strong className="text-snow">Address:</strong>
            <br />
            46/A1, Ground Floor, Mannur, Mattannur, Kannur, Kerala – 670702, India
          </p>
          <p>
            <strong className="text-snow">Email:</strong>{' '}
            <a href="mailto:info@codewix.in" className="text-accent hover:text-accent-dim">
              info@codewix.in
            </a>
          </p>
          <p>
            <strong className="text-snow">Phone:</strong>{' '}
            <a href="tel:+919746109569" className="text-accent hover:text-accent-dim">
              +91 9746109569
            </a>
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>Depending on how you use our Service, we may collect the following information:</p>
          <h3 className="text-base font-semibold text-snow pt-2">Personal Information</h3>
          <BulletList
            items={[
              'Full name',
              'Email address',
              'Phone number (if provided)',
              'Account credentials',
              'Billing information',
              'Subscription details',
            ]}
          />
          <h3 className="text-base font-semibold text-snow pt-2">Account Information</h3>
          <BulletList
            items={[
              'User ID',
              'Login history',
              'Profile information',
              'Account preferences',
            ]}
          />
          <h3 className="text-base font-semibold text-snow pt-2">Uploaded Content</h3>
          <p>When using our AI services, you may upload:</p>
          <BulletList
            items={[
              'Product photographs',
              'Images',
              'Text prompts',
              'Video generation requests',
              'Other content submitted through the platform',
            ]}
          />
          <h3 className="text-base font-semibold text-snow pt-2">Payment Information</h3>
          <p>
            Payments are securely processed through <strong className="text-snow">Razorpay</strong>.
          </p>
          <p>
            We do <strong className="text-snow">not</strong> store your complete debit card, credit
            card, UPI PIN, banking passwords, or CVV information on our servers.
          </p>
          <p>Payment information is handled according to Razorpay&apos;s security standards.</p>
        </Section>

        <Section title="3. Automatically Collected Information">
          <p>When you use the Service, we may automatically collect:</p>
          <BulletList
            items={[
              'IP address',
              'Browser type',
              'Device information',
              'Operating system',
              'Language settings',
              'Time zone',
              'Usage statistics',
              'Log files',
              'Error reports',
              'Session information',
              'Pages visited',
              'Date and time of access',
            ]}
          />
        </Section>

        <Section title="4. Cookies and Similar Technologies">
          <p>We use cookies and similar technologies to:</p>
          <BulletList
            items={[
              'Keep you signed in',
              'Remember your preferences',
              'Improve performance',
              'Enhance user experience',
              'Analyze platform usage',
              'Protect against fraud and abuse',
            ]}
          />
          <p>
            You may disable cookies in your browser, although some features of the Service may not
            function properly.
          </p>
        </Section>

        <Section title="5. How We Use Your Information">
          <p>We use your information to:</p>
          <BulletList
            items={[
              'Create and manage your account',
              'Provide AI video generation services',
              'Process uploaded images and prompts',
              'Deliver generated videos',
              'Process subscription payments',
              'Improve AI performance and platform functionality',
              'Respond to customer support requests',
              'Send service-related communications',
              'Detect fraud, abuse, or unauthorized activity',
              'Comply with legal obligations',
              'Enforce our Terms & Conditions',
            ]}
          />
        </Section>

        <Section title="6. AI Processing">
          <p>
            Your uploaded images and prompts are processed using Artificial Intelligence
            technologies, including third-party AI providers where applicable.
          </p>
          <p>
            Your content is processed solely to generate the requested output and operate the
            Service.
          </p>
        </Section>

        <Section title="7. Sharing of Information">
          <p>We do not sell your personal information.</p>
          <p>
            We may share information with trusted service providers who help us operate the Service,
            including:
          </p>
          <BulletList
            items={[
              'Payment processors (such as Razorpay)',
              'Cloud hosting providers',
              'AI model providers',
              'Analytics providers',
              'Customer support providers',
              'Security and fraud prevention services',
            ]}
          />
          <p>
            These providers receive only the information necessary to perform their services and are
            required to protect it.
          </p>
        </Section>

        <Section title="8. Data Retention">
          <p>We retain your information only for as long as necessary to:</p>
          <BulletList
            items={[
              'Maintain your account',
              'Provide the Service',
              'Meet legal and regulatory requirements',
              'Resolve disputes',
              'Enforce our agreements',
            ]}
          />
          <p>
            When information is no longer required, we take reasonable steps to securely delete or
            anonymize it.
          </p>
        </Section>

        <Section title="9. Data Security">
          <p>
            We implement commercially reasonable technical and organizational measures to protect
            your information against unauthorized access, loss, misuse, alteration, or disclosure.
          </p>
          <p>
            However, no method of internet transmission or electronic storage is completely secure,
            and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="10. Your Rights">
          <p>Subject to applicable law, you may have the right to:</p>
          <BulletList
            items={[
              'Access your personal information',
              'Correct inaccurate information',
              'Update your account information',
              'Request deletion of your personal information',
              'Request a copy of your personal data',
              'Withdraw consent where processing is based on consent',
              'Object to certain processing activities',
            ]}
          />
          <p>
            To exercise these rights, please contact us using the information provided below.
          </p>
        </Section>

        <Section title="11. Account Deletion">
          <p>You may request deletion of your account by contacting us.</p>
          <p>
            We may retain certain information where required by law, to resolve disputes, prevent
            fraud, or enforce our legal rights.
          </p>
        </Section>

        <Section title="12. Children&apos;s Privacy">
          <p>Our Service is not directed to children under the age of 18.</p>
          <p>
            We do not knowingly collect personal information from children. If we become aware that
            such information has been collected, we will take reasonable steps to delete it.
          </p>
        </Section>

        <Section title="13. Third-Party Services">
          <p>
            Our Service may integrate with third-party services, including payment processors, AI
            providers, analytics providers, and cloud infrastructure providers.
          </p>
          <p>
            Their collection and use of information are governed by their own privacy policies.
          </p>
          <p>We encourage you to review those policies before using their services.</p>
        </Section>

        <Section title="14. International Data Transfers">
          <p>
            Depending on the AI models and cloud services used, your information may be processed or
            stored in countries other than your own.
          </p>
          <p>
            Where applicable, we take reasonable measures to ensure that such transfers comply with
            applicable data protection laws.
          </p>
        </Section>

        <Section title="15. Legal Compliance">
          <p>
            We may disclose your information if required to do so by law or in response to valid
            legal requests from courts, law enforcement agencies, or government authorities.
          </p>
        </Section>

        <Section title="16. Business Transfers">
          <p>
            If Codewix Studio undergoes a merger, acquisition, restructuring, or sale of assets,
            your information may be transferred as part of that transaction, subject to applicable
            legal requirements.
          </p>
        </Section>

        <Section title="17. Changes to This Privacy Policy">
          <p>We may update this Privacy Policy from time to time.</p>
          <p>
            Any changes will become effective when the updated version is published on our platform.
          </p>
          <p>
            Your continued use of the Service after such updates constitutes acceptance of the
            revised Privacy Policy.
          </p>
        </Section>

        <Section title="18. Contact Us">
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our
            data practices, please contact:
          </p>
          <p>
            <strong className="text-snow">Codewix Studio</strong>
          </p>
          <p>
            46/A1, Ground Floor, Mannur, Mattannur, Kannur, Kerala – 670702, India
          </p>
          <p>
            Email:{' '}
            <a href="mailto:info@codewix.in" className="text-accent hover:text-accent-dim">
              info@codewix.in
            </a>
          </p>
          <p>
            Phone:{' '}
            <a href="tel:+919746109569" className="text-accent hover:text-accent-dim">
              +91 9746109569
            </a>
          </p>
        </Section>
      </LegalShell>
    </>
  );
}

export function RefundPage() {
  return (
    <>
      <SeoHead
        page="refund"
        title="Refund & Cancellation Policy | Codewix Studio"
        description="Refund and cancellation terms for Codewix Studio Pro subscriptions and paid AI product video services."
      />
      <LegalShell
        title="Refund & Cancellation Policy"
        subtitle="Effective Date: July 23, 2026"
      >
        <Section title="Welcome">
          <p>
            This Refund &amp; Cancellation Policy explains the terms governing subscription
            cancellations, refunds, and payment-related matters for the AI-powered product video
            generation platform operated by <strong className="text-snow">Codewix Studio</strong>{' '}
            (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
          </p>
          <p>
            By purchasing a subscription or using any paid services, you agree to this Policy.
          </p>
        </Section>

        <Section title="1. Company Information">
          <p>
            <strong className="text-snow">Company Name:</strong> Codewix Studio
          </p>
          <p>
            <strong className="text-snow">Address:</strong>
            <br />
            46/A1, Ground Floor, Mannur, Mattannur, Kannur, Kerala – 670702, India
          </p>
          <p>
            <strong className="text-snow">Email:</strong>{' '}
            <a href="mailto:info@codewix.in" className="text-accent hover:text-accent-dim">
              info@codewix.in
            </a>
          </p>
          <p>
            <strong className="text-snow">Phone:</strong>{' '}
            <a href="tel:+919746109569" className="text-accent hover:text-accent-dim">
              +91 9746109569
            </a>
          </p>
        </Section>

        <Section title="2. Subscription Plans">
          <p>
            We offer both <strong className="text-snow">Free</strong> and{' '}
            <strong className="text-snow">Pro</strong> subscription plans.
          </p>
          <p>
            The Pro plan provides access to premium features, including higher generation limits,
            faster processing, premium AI models, and additional capabilities. Features may change as
            the Service evolves.
          </p>
        </Section>

        <Section title="3. Cancellation Policy">
          <p>
            You may cancel your Pro subscription at any time through your account settings or by
            contacting our support team.
          </p>
          <p>
            Cancellation will prevent future renewals (if applicable). Your subscription will remain
            active until the end of the current billing period, after which it will expire
            automatically.
          </p>
          <p>
            No partial refunds or prorated credits will be issued for the unused portion of the
            subscription period.
          </p>
        </Section>

        <Section title="4. Refund Policy">
          <p>
            Due to the nature of digital services and AI processing, all subscription fees and
            purchases are generally <strong className="text-snow">non-refundable</strong> once
            payment has been successfully processed.
          </p>
          <p>Refunds will not be provided for:</p>
          <BulletList
            items={[
              'Change of mind after purchase.',
              'Partial use of the subscription.',
              'Failure to use the Service.',
              'Dissatisfaction with AI-generated results where the Service functioned as intended.',
              'Accidental purchases caused by user error.',
              'Subscription renewals not cancelled before the renewal date.',
            ]}
          />
        </Section>

        <Section title="5. Eligible Refunds">
          <p>A refund may be considered only in exceptional circumstances, including:</p>
          <BulletList
            items={[
              'Duplicate payments for the same subscription.',
              'Incorrect billing due to a technical error caused by our systems.',
              'Payment successfully completed but subscription not activated, and the issue cannot be resolved.',
              'Any other situation where we determine, at our sole discretion, that a refund is appropriate.',
            ]}
          />
          <p>
            Approved refunds will be processed using the original payment method where possible.
          </p>
        </Section>

        <Section title="6. Failed or Pending Payments">
          <p>If a payment fails or remains pending:</p>
          <BulletList
            items={[
              'Your subscription may not be activated until payment is successfully completed.',
              'Any pending amount is handled by your payment provider or bank.',
              'Please contact your bank or Razorpay for payment status if funds have been debited but your payment remains pending.',
            ]}
          />
        </Section>

        <Section title="7. Payment Processing">
          <p>
            Payments are securely processed through <strong className="text-snow">Razorpay</strong>.
          </p>
          <p>
            We do not collect or store your complete debit card, credit card, UPI PIN, net banking
            credentials, or CVV information.
          </p>
          <p>
            Payment processing is subject to Razorpay&apos;s security standards and applicable
            banking regulations.
          </p>
        </Section>

        <Section title="8. Chargebacks">
          <p>
            If you initiate an unauthorized chargeback or payment dispute without first contacting us
            to resolve the issue, we reserve the right to:
          </p>
          <BulletList
            items={[
              'Suspend or terminate your account.',
              'Revoke access to paid features.',
              'Restrict future purchases.',
              'Take appropriate legal action where permitted by law.',
            ]}
          />
        </Section>

        <Section title="9. Promotional Offers">
          <p>
            Subscriptions or services purchased under promotional campaigns, discounts, coupons, or
            limited-time offers remain subject to this Refund &amp; Cancellation Policy unless
            explicitly stated otherwise.
          </p>
        </Section>

        <Section title="10. Service Availability">
          <p>
            Temporary outages, maintenance, third-party AI provider interruptions, or internet
            connectivity issues do not automatically qualify for refunds.
          </p>
          <p>
            We will make reasonable efforts to restore normal service as quickly as possible.
          </p>
        </Section>

        <Section title="11. Changes to Subscription Plans">
          <p>
            We reserve the right to modify subscription pricing, features, or plans at any time.
          </p>
          <p>
            Any changes will apply prospectively and will not affect payments already completed for
            the current billing period unless required by law.
          </p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>We may update this Refund &amp; Cancellation Policy from time to time.</p>
          <p>
            The updated version becomes effective immediately upon publication on our platform.
          </p>
          <p>
            Continued use of the Service after any update constitutes acceptance of the revised
            Policy.
          </p>
        </Section>

        <Section title="13. Contact Us">
          <p>
            If you have any questions regarding cancellations, refunds, or payments, please contact:
          </p>
          <p>
            <strong className="text-snow">Codewix Studio</strong>
          </p>
          <p>
            46/A1, Ground Floor, Mannur, Mattannur, Kannur, Kerala – 670702, India
          </p>
          <p>
            Email:{' '}
            <a href="mailto:info@codewix.in" className="text-accent hover:text-accent-dim">
              info@codewix.in
            </a>
          </p>
          <p>
            Phone:{' '}
            <a href="tel:+919746109569" className="text-accent hover:text-accent-dim">
              +91 9746109569
            </a>
          </p>
        </Section>
      </LegalShell>
    </>
  );
}

export function ContactPage() {
  return (
    <>
      <SeoHead
        page="contact"
        title="Contact Us | Codewix Studio"
        description="Contact Codewix Studio for support, billing, account help, partnerships, and feedback. Email info@codewix.in or call +91 9746109569."
      />
      <LegalShell title="Contact Us" subtitle="We're here to help">
        <Section title="Get in touch">
          <p>
            We&apos;re here to help. If you have any questions, feedback, technical issues, billing
            inquiries, or need assistance with your account, please don&apos;t hesitate to contact
            us.
          </p>
          <p>Our support team will make every effort to respond as quickly as possible.</p>
        </Section>

        <Section title="Customer Support">
          <p>
            <strong className="text-snow">Email:</strong>{' '}
            <a href="mailto:info@codewix.in" className="text-accent hover:text-accent-dim">
              info@codewix.in
            </a>
          </p>
          <p>
            <strong className="text-snow">Phone:</strong>{' '}
            <a href="tel:+919746109569" className="text-accent hover:text-accent-dim">
              +91 9746109569
            </a>
          </p>
          <p>
            <strong className="text-snow">Business Hours:</strong>
          </p>
          <BulletList
            items={[
              'Monday – Saturday: 9:00 AM – 6:00 PM (IST)',
              'Sunday: Closed',
            ]}
          />
        </Section>

        <Section title="Registered Office">
          <p>
            <strong className="text-snow">Codewix Studio</strong>
          </p>
          <p>46/A1, Ground Floor, Mannur, Mattannur, Kannur, Kerala – 670702, India</p>
        </Section>

        <Section title="What Can We Help You With?">
          <p>You can contact us regarding:</p>
          <BulletList
            items={[
              'General inquiries',
              'Technical support',
              'Account-related issues',
              'Subscription and billing questions',
              'Payment assistance',
              'Refund and cancellation requests',
              'Feature requests and feedback',
              'Bug reports',
              'Business partnerships',
              'Copyright or intellectual property concerns',
              'Privacy-related requests',
            ]}
          />
        </Section>

        <Section title="Response Time">
          <p>
            We aim to respond to all inquiries within{' '}
            <strong className="text-snow">1–2 business days</strong>. During periods of high demand,
            response times may be slightly longer.
          </p>
        </Section>

        <Section title="Before Contacting Us">
          <p>To help us resolve your issue quickly, please include:</p>
          <BulletList
            items={[
              'Your registered email address',
              'A clear description of your issue',
              'Screenshots or screen recordings (if applicable)',
              'Transaction or payment reference number (for billing-related inquiries)',
            ]}
          />
        </Section>

        <Section title="Privacy">
          <p>
            Any information you provide when contacting us will be handled in accordance with our{' '}
            <Link to="/privacy" className="text-accent hover:text-accent-dim">
              Privacy Policy
            </Link>{' '}
            and used solely for responding to your inquiry and improving our services.
          </p>
        </Section>

        <Section title="Contact Information">
          <p>
            <strong className="text-snow">Codewix Studio</strong>
          </p>
          <p>📍 46/A1, Ground Floor, Mannur, Mattannur, Kannur, Kerala – 670702, India</p>
          <p>
            📧 Email:{' '}
            <a href="mailto:info@codewix.in" className="text-accent hover:text-accent-dim">
              info@codewix.in
            </a>
          </p>
          <p>
            📞 Phone:{' '}
            <a href="tel:+919746109569" className="text-accent hover:text-accent-dim">
              +91 9746109569
            </a>
          </p>
        </Section>
      </LegalShell>
    </>
  );
}
