import React from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import PropertySelectApp from '../../components/PropertySelect/PropertySelectApp';
import '../../styles/property_select.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <PropertySelectApp />
  </ErrorBoundary>
);
