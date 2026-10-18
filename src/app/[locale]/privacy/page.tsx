import { stubRoute } from '@/lib/stub-route';

const route = stubRoute('privacy', '/privacy');

export const generateMetadata = route.generateMetadata;
export default route.Page;
