import { stubRoute } from '@/lib/stub-route';

const route = stubRoute('brands', '/brands');

export const generateMetadata = route.generateMetadata;
export default route.Page;
