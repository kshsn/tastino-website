import { notFound } from 'next/navigation';

// Any unknown path under /en or /ar renders the localized 404 with an HTTP 404 status.
export default function CatchAll() {
  notFound();
}
