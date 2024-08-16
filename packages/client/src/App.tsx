import React from 'react';
//import {Terrender, StandardInputHandler} from 'terrender-core';

const App: React.FC = () => {
  const greeting = "Hello World";
  const numberInput = 10;

  return (
    <div>
      <h1>{greeting} is the Hello</h1>
      <p>{numberInput}</p>
    </div>
  );
};

//Canvas Component which renders Terrender fully as is

export default App;
