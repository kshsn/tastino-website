import { stubRoute } from '@/lib/stub-route';

const route = stubRoute('products', '/products');

export const generateMetadata = route.generateMetadata;
export default route.Page;
