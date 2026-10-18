import { stubRoute } from '@/lib/stub-route';

const route = stubRoute('quality', '/quality');

export const generateMetadata = route.generateMetadata;
export default route.Page;
