'use client';
import Link from 'next/link';
import SpotlightCard from '@/components/ui/SpotlightCard';

export default function ProjectCard({ project }: {
  project: { id: string; name: string; githubRepoOwner: string; githubRepoName: string; description?: string; tags?: string };
}) {
  return (
    <Link href={`/project/${project.id}`}>
      <SpotlightCard className="cursor-pointer hover:border-gray-600 transition-colors">
        <h3 className="font-semibold text-lg">{project.name}</h3>
        <p className="text-sm text-gray-400 mt-1">{project.githubRepoOwner}/{project.githubRepoName}</p>
        {project.description && <p className="text-sm text-gray-300 mt-2 line-clamp-2">{project.description}</p>}
        {project.tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {project.tags.split(',').map(t => (
              <span key={t.trim()} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{t.trim()}</span>
            ))}
          </div>
        )}
      </SpotlightCard>
    </Link>
  );
}
