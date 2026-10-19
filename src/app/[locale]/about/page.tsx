import { stubRoute } from '@/lib/stub-route';

const route = stubRoute('about', '/about');

export const generateMetadata = route.generateMetadata;
export default route.Page;
