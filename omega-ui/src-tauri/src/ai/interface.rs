use crate::ai::models::*;
use crate::error::OmegaResult;

pub trait LLMProvider: Send + Sync {
    fn id(&self) -> ProviderId;
    fn capabilities(&self) -> ProviderCapabilities;
    fn generate(&self, req: CompletionRequest) -> OmegaResult<CompletionResponse>;
    fn embed(&self, req: EmbeddingRequest) -> OmegaResult<EmbeddingResponse>;
    fn health(&self) -> bool;
}
