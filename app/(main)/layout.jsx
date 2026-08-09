import React from "react";

const MainLayout = async ({ children }) => {
  // Remove top margin since header is fixed with h-20 and pages use pt-20 from root layout
  // No extra padding here — each page controls its own container/padding
  return <div>{children}</div>;
};

export default MainLayout;
