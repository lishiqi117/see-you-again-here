import React from 'react';
import {createRoot} from 'react-dom/client';
import DreamScene from './components/DreamScene';
const root=createRoot(document.getElementById('root'));
root.render(<DreamScene/>);
// Explicit teardown for integration in a larger single-page site.
window.dreamScene={unmount:()=>root.unmount()};
