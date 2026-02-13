import { Metadata } from 'next';
import LoveCompilerClient from './LoveCompilerClient';

export const metadata: Metadata = {
    title: 'Love Compiler',
    robots: 'noindex, nofollow',
};

export default function LoveCompilerPage() {
    return <LoveCompilerClient />;
}
