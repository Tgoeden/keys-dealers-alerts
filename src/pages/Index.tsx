import React from 'react';
import AppLayout from '@/components/AppLayout';

// Simple wrapper - no error boundary here to prevent double rendering
const Index: React.FC = () => {
  return <AppLayout />;
};

export default Index;
