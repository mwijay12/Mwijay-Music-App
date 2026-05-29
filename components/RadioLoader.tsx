import React from 'react';
import Loader from './Loader.tsx';

const RadioLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader text="Radio Loading" />
    </div>
  );
}

export default RadioLoader;
