import asyncio
import json
from app.services.rag_service import RAGService
from app.database import get_db

async def main():
    try:
        from app.database import init_db
        await init_db()
        
        # Pega a "conexão"
        gen = get_db()
        db = await gen.__anext__()
        
        # Encontra a primeira campanha
        campaigns = await db.campaigns.find({}).to_list(1)
        if not campaigns:
            print("Nenhuma campanha encontrada.")
            return
            
        campaign = campaigns[0]
        campaign_id = campaign["id"]
        print(f"Testando campanha: {campaign['name']} ({campaign_id})")
        
        rag_service = RAGService()
        
        # Força a reindexação para ter certeza que temos os últimos vetores com sentence-transformers
        status = await rag_service.reindex_campaign(campaign_id, db)
        print("Status da reindexação:", status)
        
        memory = await rag_service.load_campaign_memory(campaign_id)
        if not memory:
            print("Memória RAG não carregada.")
            return
            
        print(f"Memória carregada com {len(memory.chunks)} fragmentos.")
        
        # Busca
        query = "teste de pesquisa"
        embeddings, _ = await rag_service.embeddings_service.get_embeddings([query], db)
        query_vector = embeddings[0]
        
        matches = memory.search(query_vector, top_k=5, threshold=0.0)
        print(f"Encontrados {len(matches)} resultados (sem threshold):")
        for chunk, score in matches:
            print(f" - [{score:.4f}] {chunk['title']}: {chunk['text'][:50]}...")
            
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    asyncio.run(main())
