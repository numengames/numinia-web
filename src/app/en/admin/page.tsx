import { redirect } from 'next/navigation';

/** Legacy /en/admin route — redirects to the new LAP structure. */
export default function AdminRedirect() {
  redirect('/en/LAP/assets');
}
