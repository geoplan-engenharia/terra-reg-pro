import { useState } from "react";
import { Bug, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useCreateSupportReport } from "@/lib/admin-queries";
import { toast } from "sonner";

export function SupportReportForm() {
  const { profile } = useAuth();
  const create = useCreateSupportReport();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportType, setReportType] = useState("bug");
  const [priority, setPriority] = useState("media");

  if (!profile) return null;

  const send = async () => {
    if (!title.trim()) {
      toast.error("Informe um título");
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        report_type: reportType,
        priority,
        organization_id: profile.organization_id,
        user_id: profile.id,
      });
      toast.success("Report enviado. Obrigado!");
      setTitle("");
      setDescription("");
      setOpen(false);
    } catch (e) {
      toast.error("Falha ao enviar", { description: (e as Error).message });
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Bug className="h-4 w-4" /> Reportar bug ou sugestão
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bug className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Enviar report</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="bg-background border border-border rounded-md h-9 px-2 text-xs">
          <option value="bug">Bug</option>
          <option value="sugestao">Sugestão</option>
          <option value="duvida">Dúvida</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-background border border-border rounded-md h-9 px-2 text-xs">
          <option value="baixa">Prioridade baixa</option>
          <option value="media">Prioridade média</option>
          <option value="alta">Prioridade alta</option>
        </select>
      </div>
      <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Descreva o problema ou sugestão…" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      <div className="flex gap-2">
        <Button size="sm" onClick={send} disabled={create.isPending} className="gap-2">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
