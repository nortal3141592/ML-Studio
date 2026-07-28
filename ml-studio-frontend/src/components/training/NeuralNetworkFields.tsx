import type { NeuralNetworkHyperparameters, LayerConfig } from '../../lib/api/types/training'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'

const activationOptions = ['relu', 'sigmoid', 'tanh', 'elu', 'selu', 'gelu', 'swish', 'softplus', 'softsign', 'linear']
  .map((v) => ({ value: v, label: v }))
const optimizerOptions = ['adam', 'sgd', 'rmsprop', 'adamw', 'adagrad', 'adadelta', 'adamax', 'nadam', 'ftrl']
  .map((v) => ({ value: v, label: v }))

interface Props {
  value: NeuralNetworkHyperparameters
  onChange: (value: NeuralNetworkHyperparameters) => void
}

export function NeuralNetworkFields({ value, onChange }: Props) {
  function updateLayer(index: number, layer: LayerConfig) {
    const layers = [...value.hidden_layers]
    layers[index] = layer
    onChange({ ...value, hidden_layers: layers })
  }

  function addLayer() {
    onChange({ ...value, hidden_layers: [...value.hidden_layers, { neurons: 32, activation: 'relu' }] })
  }

  function removeLayer(index: number) {
    onChange({ ...value, hidden_layers: value.hidden_layers.filter((_, i) => i !== index) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm text-text-muted">Hidden layers</p>
        <div className="flex flex-col gap-2">
          {value.hidden_layers.map((layer, i) => (
            <div key={i} className="flex items-end gap-2">
              <Input
                label="Neurons"
                type="number"
                value={layer.neurons}
                onChange={(e) => updateLayer(i, { ...layer, neurons: Number(e.target.value) })}
              />
              <Select
                label="Activation"
                value={layer.activation ?? 'relu'}
                onChange={(e) => updateLayer(i, { ...layer, activation: e.target.value as LayerConfig['activation'] })}
                options={activationOptions}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeLayer(i)}
                disabled={value.hidden_layers.length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" className="mt-2" onClick={addLayer}>
          Add layer
        </Button>
      </div>

      <Select
        label="Optimizer"
        value={value.optimizer ?? 'adam'}
        onChange={(e) => onChange({ ...value, optimizer: e.target.value as NeuralNetworkHyperparameters['optimizer'] })}
        options={optimizerOptions}
      />
      <Input label="Epochs" type="number" value={value.epochs ?? 100} onChange={(e) => onChange({ ...value, epochs: Number(e.target.value) })} />
      <Input label="Learning rate" type="number" step={0.0001} value={value.learning_rate ?? 0.001} onChange={(e) => onChange({ ...value, learning_rate: Number(e.target.value) })} />
      <Input label="Batch size" type="number" value={value.batch_size ?? 32} onChange={(e) => onChange({ ...value, batch_size: Number(e.target.value) })} />
    </div>
  )
}