package com.mycem.elderCareRemainderSystem;

import java.util.List;

import org.springframework.stereotype.Service;



@Service
public class MedicineService {

    private final MedicineRepository repository;

    public MedicineService(MedicineRepository repository) {
        this.repository = repository;
    }

    public Medicine addMedicine(Medicine medicine) {
        return repository.save(medicine);
    }

    public List<Medicine> getAllMedicines() {
        return repository.findAll();
    }

    public Medicine getMedicineById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public void deleteMedicine(Long id) {
        repository.deleteById(id);
    }
}