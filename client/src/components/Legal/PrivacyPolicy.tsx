import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-white p-6 dark:bg-gray-900">
      <div className="w-full max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
          Privacy Policy
        </h1>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <p className="text-gray-700 dark:text-gray-300">
            This privacy policy describes how AIMS AI-Assisted Learning collects, uses, and protects your information.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            Information We Collect
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            We collect information you provide directly to us, such as when you create an account,
            use our services, or contact us for support.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            How We Use Your Information
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            We use the information we collect to provide, maintain, and improve our services,
            and to communicate with you about your account and our services.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            Information Sharing
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            We do not sell, trade, or otherwise transfer your personal information to third parties
            without your consent, except as described in this policy.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            Data Security
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            We implement appropriate security measures to protect your personal information
            against unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            Contact Us
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
}