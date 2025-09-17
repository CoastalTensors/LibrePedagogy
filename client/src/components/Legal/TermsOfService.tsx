import React from 'react';

export default function TermsOfService() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-white p-6 dark:bg-gray-900">
      <div className="w-full max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
          Terms of Service
        </h1>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <p className="text-gray-700 dark:text-gray-300">
            By using AIMS AI-Assisted Learning, you agree to be bound by these Terms of Service.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            Acceptance of Terms
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            By accessing and using this service, you accept and agree to be bound by the terms
            and provision of this agreement.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            Use License
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            Permission is granted to use this AI-assisted learning platform for educational
            purposes in accordance with these terms.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            User Responsibilities
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            Users are responsible for maintaining the confidentiality of their account
            information and for all activities that occur under their account.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            Prohibited Uses
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            You may not use our service for any unlawful purpose or to solicit others
            to perform unlawful acts.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            Limitation of Liability
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            AIMS AI-Assisted Learning shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
            Contact Information
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            If you have any questions about these Terms of Service, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
}