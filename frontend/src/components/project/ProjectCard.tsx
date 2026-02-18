'use client';
import Link from 'next/link';
import SpotlightCard from '@/components/ui/SpotlightCard';

export default function ProjectCard({ project }: {
  project: { id: string; name: string; githubRepoOwner: string; githubRepoName: string };
}) {
  return (
    <Link href={`/project/${project.id}`}>
      <SpotlightCard className="cursor-pointer hover:border-gray-600 transition-colors">
        <h3 className="font-semibold text-lg">{project.name}</h3>
        <p className="text-sm text-gray-400 mt-1">{project.githubRepoOwner}/{project.githubRepoName}</p>
      </SpotlightCard>
    </Link>
  );
}
