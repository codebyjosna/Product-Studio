import React from 'react';
import { AuthShell } from '../components/AppHeader';

export function TermsPage() {
  return (
    <AuthShell title="Terms & Conditions" subtitle="Rules for using Product Studio">
      <div className="space-y-3 text-sm text-mist leading-relaxed max-h-[50vh] overflow-y-auto pr-1">
        <p>By using Product Studio, you agree to upload only content you have rights to use.</p>
        <p>Do not generate content that infringes intellectual property, privacy, or applicable law.</p>
        <p>Generated outputs are provided as-is. You are responsible for how you use them.</p>
        <p>We may update these terms; continued use means you accept the latest version.</p>
      </div>
    </AuthShell>
  );
}

export function PrivacyPage() {
  return (
    <AuthShell title="Privacy Policy" subtitle="How we handle your information">
      <div className="space-y-3 text-sm text-mist leading-relaxed max-h-[50vh] overflow-y-auto pr-1">
        <p>Account details (name, email) are stored to provide sign-in and studio access.</p>
        <p>Uploaded media and prompts are processed to generate product imagery and video.</p>
        <p>We do not sell your personal information. You can sign out at any time from the account menu.</p>
        <p>Contact us if you need account deletion or data questions.</p>
      </div>
    </AuthShell>
  );
}
