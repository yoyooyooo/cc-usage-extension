import { createRoot } from 'react-dom/client';
import Options from './Options';
import '../popup/style.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Options />);
}