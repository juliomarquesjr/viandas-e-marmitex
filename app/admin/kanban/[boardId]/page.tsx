import { BoardView } from "../_components/board/BoardView";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;
  return <BoardView boardId={boardId} />;
}
