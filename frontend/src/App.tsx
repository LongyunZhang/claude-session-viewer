import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Session } from './pages/Session';
import { Usage } from './pages/Usage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session/:id" element={<Session />} />
        <Route path="/usage" element={<Usage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
