import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Empty } from '../components/ui';

export default function NotFound() {
  return <div className="container-x"><Empty icon={Compass} title="Page not found" text="The page you're looking for doesn't exist or has moved." action={<Link to="/" className="btn-primary">Go home</Link>} /></div>;
}
