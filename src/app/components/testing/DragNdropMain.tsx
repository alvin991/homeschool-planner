import DraggableItem, { itemType } from "./DraggableItem";


function DragNdropMain() {
    const items: itemType[] = [
        { id: '1', content: 'Item 1' },
        { id: '2', content: 'Item 2' },
        { id: '3', content: 'Item 3' },
    ];
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Drag and Drop Test</h1>
            {items.map((item) => (
                // <div key={item.id} className="p-4 mb-2 bg-gray-200 rounded">
                //     {item.content}
                // </div>
                <DraggableItem key={item.id} id={item.id} content={item.content} />
            ))}
        </div>
    );
}

export default DragNdropMain;