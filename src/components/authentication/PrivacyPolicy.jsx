const PrivacyPolicy = () => {
  return (
    <div className="legal-page min-h-screen bg-slate-50 dark:bg-[#232323] py-12 px-6 transition-colors">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-xl p-10 border border-slate-200 dark:border-slate-700">
        
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold text-amber-600 dark:text-amber-500">Privacy Policy</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">Last updated: February 20, 2026</div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
          <p className="text-lg">At T4SK, we take your privacy seriously.</p>

          <h2 className="text-2xl font-semibold mt-10">1. Information We Collect</h2>
          <ul>
            <li>Account information (name, email, profile picture)</li>
            <li>Task data and project content you create</li>
            <li>Usage data (how you use the app)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-10">2. How We Use Your Information</h2>
          <p>To provide, improve, and secure the T4SK service.</p>

          <h2 className="text-2xl font-semibold mt-10">3. Data Sharing</h2>
          <p>We do not sell your data. We only share with service providers (Firebase, etc.) under strict contracts.</p>

          <h2 className="text-2xl font-semibold mt-10">4. Your Rights</h2>
          <p>You can request to access, correct, or delete your data at any time.</p>

          <h2 className="text-2xl font-semibold mt-10">5. Cookies &amp; Tracking</h2>
          <p>We use essential cookies to keep you logged in and provide the best experience.</p>

          <h2 className="text-2xl font-semibold mt-10">6. Data Retention</h2>
          <p>We keep your data only as long as your account is active or as required by law.</p>

          {/* Themed info box */}
          <div className="mt-12 p-6 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-sm border border-amber-200 dark:border-amber-900/50">
            <strong className="text-amber-700 dark:text-amber-400">Data Protection Officer:</strong> privacy@t4sk.app<br />
            We are fully compliant with the Philippine Data Privacy Act (RA 10173).
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;