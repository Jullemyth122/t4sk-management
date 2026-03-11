// App.jsx (router snippet)
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Task from "./Task";
import Home from "./components/Home";
import Signup from "./components/authentication/Signup";
import ChooseAccountType from "./components/ChooseAccountType";
import PublicRoute from "./routes/PublicRoute"; // optional keep

import AuthGuard from "./routes/AuthGuard"; // auth guard is equal to this three component
import PersonalInfo from "./info/PersonalInfo";
import BusinessInfo from "./info/BusinessInfo";
import BusinessDashboardSimple from "./dashboard/BusinessDashboard";
import PersonalDashboard from "./dashboard/PersonalDashboard";
import Pricing from "./components/Pricing";
import PaymentSuccess from "./components/PaymentSuccess";
import ErrorBoundary from "./components/ErrorBoundary";

import TermsPage from "./components/authentication/TermsPage";
import PrivacyPolicy from "./components/authentication/PrivacyPolicy";

// import SecureRoute from "./routes/SecureRoute";
// import RequireAccountType from "./routes/RequireAccountType";
// import ChooseAccountGuard from "./routes/ChooseAccountGuard";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      // Wrap Task so logged-in users without accountType are forced to /choose-account
      <ErrorBoundary>
        <AuthGuard requireAuth={false} requireType="present">
          <Task />
        </AuthGuard>
      </ErrorBoundary>
    ),
    errorElement: <div>Oops</div>,
    children: [   
      { path: "home", element: <PublicRoute><Home simulateLoading={true}/></PublicRoute> },  
      { path: "signup", element: <PublicRoute><Signup simulateLoading={true}/></PublicRoute> },
      { path: "terms", element: <PublicRoute><TermsPage /></PublicRoute> },
      { path: "privacy", element: <PublicRoute><PrivacyPolicy /></PublicRoute> },
      // These are children of Task so they show navbar (AuthGuard above will block access if no accountType)
      { path: "personal",
        element: (
          <AuthGuard requireAuth={true} requireType="present">
            <PersonalInfo simulateLoading={true}/>
          </AuthGuard>
        )
      },
      {
        path: "personalDashboard",
        element: (
          <AuthGuard requireAuth={true} requireType="present">
            <PersonalDashboard />
          </AuthGuard>
        )
      },
      { path: "business",
        element: (
          <AuthGuard requireAuth={true} requireType="present">
            <BusinessInfo simulateLoading={true} />
          </AuthGuard>
        )
      },
      { path: "businessDashboard",
        element: (
          <AuthGuard requireAuth={true} requireType="present">
            <BusinessDashboardSimple simulateLoading={true} />
          </AuthGuard>
        )
      },
      {
        path: "pricing",
        element: (
          <AuthGuard requireAuth={true} requireType="present">
            <Pricing />
          </AuthGuard>
        )
      },
      {
        path: "payment-success",
        element: (
          <AuthGuard requireAuth={true} requireType="present">
            <PaymentSuccess />
          </AuthGuard>
        )
      },

      { path: "*", element: <ErrorBoundary /> },
    ]
  },

  // choose-account is top-level (no navbar). Only allow logged-in users who DON'T have accountType:
  {
    path: "choose-account",
    element: (
      <ErrorBoundary>
        <AuthGuard requireAuth={true} requireType="absent">
          <ChooseAccountType />
        </AuthGuard>
      </ErrorBoundary>
    )
  },
]);

function App() {

  return (
    <>
      <RouterProvider router={router}/>
    </>
  )
}

export default App
