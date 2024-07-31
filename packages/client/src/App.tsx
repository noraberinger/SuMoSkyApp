import React from 'react';

const App: React.FC = () => {
  const greeting = "Hello World";
  const numberInput = 3;

  return (
    <div>
      <h1>{greeting} is the Hello</h1>
      <p>{numberInput}</p>
    </div>
  );
};

export default App;
