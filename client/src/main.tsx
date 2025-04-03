import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {createBrowserRouter, RouterProvider} from "react-router";

import Home from "./Home.tsx";
import Success from "./Success.tsx";

import './index.css'

const BrowserRouter = createBrowserRouter([
    { path: '/', element: <Home/>},
    { path: '/auth/success', element: <Success /> },
]);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <RouterProvider router={BrowserRouter} />
  </StrictMode>,
)
