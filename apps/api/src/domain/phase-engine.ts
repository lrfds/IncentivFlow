import { PhaseType } from '@prisma/client';

export interface TransitionValidation {
  valid: boolean;
  errors: string[];
  requiredFields?: string[];
}

export interface ProjectForValidation {
  id: string;
  currentPhase: PhaseType;
  valueRequested?: number | null;
  valueApproved?: number | null;
  valueCaptured?: number | null;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  protocolNumber?: string | null;
  documentsCount: number;
  hasClientApproval?: boolean;
}

export class PhaseEngine {
  private static readonly TRANSITIONS: Record<PhaseType, PhaseType[]> = {
    ELABORACAO: ['APROVACAO_CLIENTE'],
    APROVACAO_CLIENTE: ['ELABORACAO', 'SUBMISSAO'],
    SUBMISSAO: ['APROVACAO_CLIENTE', 'ACOMPANHAMENTO'],
    ACOMPANHAMENTO: ['SUBMISSAO', 'POS_APROVACAO'],
    POS_APROVACAO: ['ACOMPANHAMENTO', 'CONCLUIDO'],
    CONCLUIDO: [], // terminal
  };

  static canTransition(from: PhaseType, to: PhaseType): boolean {
    return this.TRANSITIONS[from]?.includes(to) ?? false;
  }

  static validateTransition(
    project: ProjectForValidation,
    toPhase: PhaseType
  ): TransitionValidation {
    const errors: string[] = [];
    const requiredFields: string[] = [];

    if (!this.canTransition(project.currentPhase, toPhase)) {
      errors.push(
        `Transição inválida: ${project.currentPhase} → ${toPhase}`
      );
      return { valid: false, errors };
    }

    // Regras de negócio por transição
    switch (toPhase) {
      case 'APROVACAO_CLIENTE':
        if (project.documentsCount < 1) {
          errors.push('Projeto deve ter ao menos 1 documento anexado');
          requiredFields.push('documentos');
        }
        if (!project.valueRequested || project.valueRequested <= 0) {
          errors.push('Valor solicitado deve ser informado');
          requiredFields.push('valueRequested');
        }
        break;

      case 'SUBMISSAO':
        if (!project.hasClientApproval) {
          errors.push('Aprovação do cliente é obrigatória');
          requiredFields.push('aprovacaoCliente');
        }
        if (!project.documentsCount || project.documentsCount < 2) {
          errors.push('Mínimo 2 documentos para submissão');
        }
        break;

      case 'ACOMPANHAMENTO':
        if (!project.submittedAt) {
          errors.push('Data de submissão não registrada');
          requiredFields.push('submittedAt');
        }
        if (!project.protocolNumber) {
          errors.push('Número de protocolo obrigatório');
          requiredFields.push('protocolNumber');
        }
        break;

      case 'POS_APROVACAO':
        if (!project.valueApproved || project.valueApproved <= 0) {
          errors.push('Valor aprovado deve ser maior que zero');
          requiredFields.push('valueApproved');
        }
        if (!project.approvedAt) {
          errors.push('Data de aprovação não registrada');
          requiredFields.push('approvedAt');
        }
        break;

      case 'CONCLUIDO':
        const captured = project.valueCaptured ?? 0;
        const approved = project.valueApproved ?? 0;
        if (approved > 0 && captured < approved * 0.8) {
          errors.push(
            `Captação insuficiente: ${((captured / approved) * 100).toFixed(1)}% (mínimo 80%)`
          );
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      requiredFields: requiredFields.length > 0 ? requiredFields : undefined,
    };
  }

  static getNextValidPhases(current: PhaseType): PhaseType[] {
    return this.TRANSITIONS[current] ?? [];
  }

  static getPhaseMetadata(phase: PhaseType) {
    const meta = {
      ELABORACAO: {
        label: 'Elaboração e Revisão Interna',
        color: 'blue',
        order: 1,
        slaDays: 30,
      },
      APROVACAO_CLIENTE: {
        label: 'Aprovação do Cliente',
        color: 'purple',
        order: 2,
        slaDays: 15,
      },
      SUBMISSAO: {
        label: 'Submissão ao Órgão',
        color: 'amber',
        order: 3,
        slaDays: 7,
      },
      ACOMPANHAMENTO: {
        label: 'Acompanhamento da Aprovação',
        color: 'cyan',
        order: 4,
        slaDays: 90,
      },
      POS_APROVACAO: {
        label: 'Pós-Aprovação e Monitoramento',
        color: 'emerald',
        order: 5,
        slaDays: 365,
      },
      CONCLUIDO: {
        label: 'Concluído',
        color: 'slate',
        order: 6,
        slaDays: 0,
      },
    };
    return meta[phase];
  }
}