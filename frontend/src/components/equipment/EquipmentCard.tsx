import type { Equipment } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EquipmentCardProps {
  item: Equipment;
}

export function EquipmentCard({ item }: EquipmentCardProps) {
  const isBroken = item.status === 'broken';

  return (
    <Card className={`overflow-hidden flex flex-col h-full ${isBroken ? 'border-red-500/50 bg-red-50/10' : ''}`}>
      <div className="aspect-[4/3] relative bg-muted flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name || 'Equipment'}
            className="w-full h-full object-cover transition-transform hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="text-muted-foreground text-sm">No Image</div>
        )}
        {item.status !== 'ok' && (
          <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded shadow-sm text-white ${
            item.status === 'broken' ? 'bg-red-500' : 'bg-orange-500'
          }`}>
            {item.status.toUpperCase()}
          </div>
        )}
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg leading-tight line-clamp-2" title={item.name || 'Unknown'}>
            {item.name || 'Unnamed Equipment'}
          </CardTitle>
          <div className="text-sm font-semibold whitespace-nowrap bg-primary/10 text-primary px-2 py-0.5 rounded">
             {item.creditCostPerDay} CR/day
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{item.typeName}</p>
      </CardHeader>
      
      <CardContent className="p-4 flex-grow">
        {item.description && (
           <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full" variant="outline">
          <a href={`/equipment/${item.id}`}>Details</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
