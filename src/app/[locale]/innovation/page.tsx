import { stubRoute } from '@/lib/stub-route';

const route = stubRoute('innovation', '/innovation');

export const generateMetadata = route.generateMetadata;
export default route.Page;
