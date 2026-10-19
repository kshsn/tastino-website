import { stubRoute } from '@/lib/stub-route';

const route = stubRoute('terms', '/terms');

export const generateMetadata = route.generateMetadata;
export default route.Page;
