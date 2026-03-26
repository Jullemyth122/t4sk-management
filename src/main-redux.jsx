import { Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ReduxThemeProvider as ThemeProvider } from './context/ReduxThemeContext.jsx'
import { ReduxAuthProvider as AuthProvider } from './context/ReduxAuthContext.jsx'

// Redux imports
import { Provider } from 'react-redux'
import { store } from './store'

createRoot(document.getElementById('root')).render(
  <Fragment>
    <Provider store={store}>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  </Fragment>,
)
