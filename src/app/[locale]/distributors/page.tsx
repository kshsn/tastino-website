import { stubRoute } from '@/lib/stub-route';

const route = stubRoute('distributors', '/distributors');

export const generateMetadata = route.generateMetadata;
export default route.Page;
