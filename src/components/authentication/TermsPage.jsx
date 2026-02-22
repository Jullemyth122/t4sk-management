const TermsPage = () => {
  return (
    <div className="legal-page min-h-screen bg-slate-50 dark:bg-[#232323] py-12 px-6 transition-colors">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-xl p-10 border border-slate-200 dark:border-slate-700">
        
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold text-amber-600 dark:text-amber-500">Terms of Service</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">Last updated: February 20, 2026</div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
          <p className="text-lg">Welcome to T4SK — your smart task management platform.</p>

          <h2 className="text-2xl font-semibold mt-10">1. Acceptance of Terms</h2>
          <p>By creating an account or using T4SK, you agree to be bound by these Terms of Service and our Privacy Policy.</p>

          <h2 className="text-2xl font-semibold mt-10">2. Who Can Use T4SK</h2>
          <p>You must be at least 13 years old (or the minimum age required in your country) to use T4SK.</p>

          <h2 className="text-2xl font-semibold mt-10">3. Account Responsibilities</h2>
          <p>You are responsible for maintaining the confidentiality of your account and password.</p>

          <h2 className="text-2xl font-semibold mt-10">4. Acceptable Use</h2>
          <p>You may not use T4SK to store illegal content, harass others, or overload our servers.</p>

          <h2 className="text-2xl font-semibold mt-10">5. Intellectual Property</h2>
          <p>T4SK and all its features are owned by us. You get a limited license to use the service.</p>

          <h2 className="text-2xl font-semibold mt-10">6. Termination</h2>
          <p>We may suspend or terminate your account for violation of these terms.</p>

          <h2 className="text-2xl font-semibold mt-10">7. Limitation of Liability</h2>
          <p>T4SK is provided "as is". We are not liable for any indirect damages.</p>

          {/* Themed info box */}
          <div className="mt-12 p-6 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-sm border border-amber-200 dark:border-amber-900/50">
            <strong className="text-amber-700 dark:text-amber-400">Questions?</strong> Contact us at support@t4sk.app
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;